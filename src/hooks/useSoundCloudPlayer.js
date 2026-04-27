import { useCallback, useEffect, useRef, useState } from "react";
import { SettingKeys, getJSON, setJSON, remove } from "../utils/settings";

const POSITION_SAVE_MS = 2000;

export function useSoundCloudPlayer() {
  const [isMounted, setIsMounted] = useState(() => getJSON(SettingKeys.musicMounted, false));
  const [isPlaying, setIsPlaying] = useState(() => getJSON(SettingKeys.musicPlaying, false));
  const [showPanel, setShowPanel] = useState(false);
  const [trackArt, setTrackArt] = useState(null);
  const [trackTitle, setTrackTitle] = useState("KEINEMUSIK");
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!isMounted) return;

    let script = document.querySelector("script[data-sc-widget]");
    let created = false;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.async = true;
      script.dataset.scWidget = "1";
      document.body.appendChild(script);
      created = true;
    }

    const wire = () => {
      if (!iframeRef.current || !window.SC) return;
      const widget = window.SC.Widget(iframeRef.current);
      let positionInterval;

      const updateTrackInfo = () => {
        widget.getCurrentSound((sound) => {
          if (!sound) return;
          setTrackArt(sound.artwork_url || sound.user.avatar_url);
          setTrackTitle(sound.title);
        });
      };

      const savePosition = () => {
        widget.getPosition((pos) => {
          if (pos > 0) setJSON(SettingKeys.musicPosition, pos);
        });
      };

      widget.bind(window.SC.Widget.Events.READY, () => {
        updateTrackInfo();
        const savedPos = getJSON(SettingKeys.musicPosition, 0);
        if (savedPos && getJSON(SettingKeys.musicPlaying, false)) {
          widget.seekTo(savedPos);
        }
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        setIsPlaying(true);
        setJSON(SettingKeys.musicPlaying, true);
        updateTrackInfo();
        if (positionInterval) clearInterval(positionInterval);
        positionInterval = setInterval(savePosition, POSITION_SAVE_MS);
        const savedPos = getJSON(SettingKeys.musicPosition, 0);
        if (savedPos) widget.seekTo(savedPos);
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setIsPlaying(false);
        setJSON(SettingKeys.musicPlaying, false);
        if (positionInterval) clearInterval(positionInterval);
        savePosition();
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
        setIsPlaying(false);
        setJSON(SettingKeys.musicPlaying, false);
        remove(SettingKeys.musicPosition);
        if (positionInterval) clearInterval(positionInterval);
      });
    };

    if (window.SC) wire();
    else script.addEventListener("load", wire, { once: true });

    return () => {
      if (created && document.body.contains(script)) document.body.removeChild(script);
    };
  }, [isMounted]);

  const togglePanel = useCallback(() => {
    if (!isMounted) {
      setIsMounted(true);
      setJSON(SettingKeys.musicMounted, true);
    }
    setShowPanel((prev) => !prev);
  }, [isMounted]);

  return {
    iframeRef,
    isMounted,
    isPlaying,
    showPanel,
    setShowPanel,
    trackArt,
    trackTitle,
    togglePanel,
  };
}

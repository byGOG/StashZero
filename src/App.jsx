import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { open, save } from "@tauri-apps/plugin-dialog";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "./utils/audio";
import "./App.css";

const SidebarIcon = ({ type }) => {
  switch (type) {
    case "globe": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
    case "terminal": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
    case "message": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.5 8.5 0 0 1 8.5 7.9Z" />
        <path d="M16 12h.01M12 12h.01M8 12h.01" strokeWidth="3" />
      </svg>
    );
    case "monitor": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
    case "file-text": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
    case "settings": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
    case "gaming": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    );
    case "security": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
    case "script": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <path d="m8 13 2 2-2 2" />
        <path d="M12 17h3" />
      </svg>
    );
    default: return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }
};

const TelemetryIcon = ({ type }) => {
  switch (type) {
    case "cpu": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M9 9h6v6H9z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2"/>
      </svg>
    );
    case "ram": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M2 6v12h20V6H2z"/>
        <path d="M21 10h-2M21 14h-2"/>
      </svg>
    );
    case "disk": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <path d="M12 18h.01" strokeWidth="3"/>
        <circle cx="12" cy="8" r="3" strokeOpacity="0.4"/>
      </svg>
    );
    case "net": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14l-4 4-4-4M19 12l-4-4-4 4"/>
        <path d="M12 2v20" strokeOpacity="0.2"/>
      </svg>
    );
    default: return null;
  }
};

const formatSpeed = (kbps) => {
  if (kbps >= 1024 * 1024) return `${(kbps / (1024 * 1024)).toFixed(1)} GB/s`;
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps.toFixed(1)} KB/s`;
};

const POPULAR_DNS = [
  { name: "Google", ips: ["8.8.8.8", "8.8.4.4"], slug: "google" },
  { name: "Cloudflare", ips: ["1.1.1.1", "1.0.0.1"], slug: "cloudflare" },
  { name: "OpenDNS", ips: ["208.67.222.222", "208.67.220.220"], slug: "cisco" }, // OpenDNS is by Cisco
  { name: "Quad9", ips: ["9.9.9.9", "149.112.112.112"], slug: "quad9" },
  { name: "AdGuard", ips: ["94.140.14.14", "94.140.15.15"], slug: "adguard" }
];

const APP_ICON_MAP = {
  chrome: "googlechrome", firefox: "firefoxbrowser", brave: "brave", opera: "opera",
  discord: "discord", slack: "slack", telegram: "telegram", whatsapp: "whatsapp",
  zoom: "zoom", teams: "microsoftteams", signal: "signal", skype: "skype",
  vscode: "visualstudiocode", git: "git", nodejs: "nodedotjs", python: "python",
  docker: "docker", postman: "postman", putty: "putty", winscp: "winscp",
  vlc: "vlcmediaplayer", spotify: "spotify", obs: "obsstudio", handbrake: "handbrake",
  audacity: "audacity", potplayer: "podplayer", kodi: "kodi", plex: "plex",
  archive: "7zip", winrar: "winrar", rufus: "rufus", notepad: "notepadplusplus",
  powertoys: "microsoftpowertoys", hwinfo: "hwinfo", cpuz: "cpuid", gpuz: "techpowerup",
  blender: "blender", gimp: "gimp", inkscape: "inkscape", figma: "figma",
  steam: "steam", epic: "epicgames", gog: "gogdotcom", origin: "origin",
  notion: "notion", evernote: "evernote", obsidian: "obsidian", adobe: "adobeacrobatreader",
  malwarebytes: "malwarebytes", bitwarden: "bitwarden", keepass: "keepassxc", qbittorrent: "qbittorrent",
  github: "github", mullvad: "mullvadbrowser", sdi: "snappydriverinstaller"
};

const SPECIAL_LOGOS = {
  chrome: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/chrome.svg",
  firefox: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/firefox.svg",
  brave: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/brave.svg",
  vscode: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/vscode.svg",
  git: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/git.svg",
  github: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg",
  python: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/python.svg",
  adobe: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adobe.svg",
  rufus: "https://rufus.ie/pics/rufus-128.png",
  winrar: "https://img.icons8.com/?size=48&id=PLvn50bVGAlA&format=png&color=000000",
  archive: "https://img.icons8.com/?size=48&id=9ha2laDO6EkM&format=png&color=000000",
  vlc: "https://img.icons8.com/color/48/vlc.png",
  handbrake: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/handbrake.svg",
  spotify: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/spotify.svg",
  powertoys: "https://img.icons8.com/?size=100&id=9CRu43eXe5Pp&format=png&color=000000",
  hwinfo: "https://www.hwinfo.com/wp-content/themes/hwinfo/img/logo-sm.png",
  cpuz: "https://www.cpuid.com/medias/images/softwares/cpu-z.svg",
  gpuz: "https://tpucdn.com/download/images/37_icon-v1775026065.png",
  teamviewer: "https://img.icons8.com/?size=100&id=bClIoRlXM2zu&format=png&color=000000",
  anydesk: "https://img.icons8.com/?size=100&id=cDG2YNX6xhA6&format=png&color=000000",
  everything: "https://www.voidtools.com/Everything.ico",
  google: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/google.svg",
  cloudflare: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/cloudflare.svg",
  mullvad: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/mullvad-browser.svg",
  zen: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/zen-browser-dark.svg",
  tor: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/tor.png",
  discord: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/discord.svg",
  whatsapp: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/whatsapp.svg",
  telegram: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/telegram.svg",
  steam: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/steam.svg",
  epic: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/epic-games-light.svg",
  bitwarden: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bitwarden.svg",
  qbittorrent: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg",
  mas: "https://massgrave.dev/img/logo.png",
  officetoolplus: "https://officetool.plus/favicon.ico",
  cttwin: "https://raw.githubusercontent.com/ChrisTitusTech/winutil/main/docs/static/favicon-32x32.png",
  sdi: "https://community.chocolatey.org/content/packageimages/sdio.1.17.8.829.png",
  ninite: "https://ninite.com/static/images/ninite-logo.png",
  fmhy: "https://fmhy.net/assets/img/fmhy-logo.png"
};

const AppLogo = ({ id, className, ...props }) => {
  if (SPECIAL_LOGOS[id]) {
    return (
      <div className={`${className} logo-container`} {...props}>
        <img src={SPECIAL_LOGOS[id]} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }

  const slug = APP_ICON_MAP[id] || "windowsterminal";
  const iconUrl = `https://cdn.simpleicons.org/${slug}`;
  
  return (
    <div className={`${className} logo-container`} {...props}>
      <img 
        src={iconUrl} 
        alt={id} 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          e.target.src = `https://i    body {
      margin: 0;
      background-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    .splash-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      position: relative;
      animation: zoomIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }  `;
        }}
      />
    </div>
  );
};

const LEGENDARY_APPS = [
  // Tarayıcılar
  { id: "chrome", name: "Google Chrome", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*95, version: "123.0", description: "Hızlı ve güvenli web tarayıcısı.", download_url: "https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B104F5E68-9A74-4C7D-8E14-4197B8233C92%7D%26lang%3Dtr%26browser%3D4%26usagestats%3D0%26appname%3DGoogle%2520Chrome%26needsadmin%3Dtrue%26ap%3Dx64-stable-statsdef_1%26installdataindex%3Ddefaultbrowser/update2/installers/ChromeSetup.exe", official_url: "https://www.google.com/chrome/" },
  { id: "firefox", name: "Firefox", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*55, version: "124.0", description: "Gizlilik odaklı özgür tarayıcı.", download_url: "https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=tr", official_url: "https://www.mozilla.org/tr/firefox/" },
  { id: "brave", name: "Brave", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*105, version: "1.64.x", description: "Reklam engelleyici entegre tarayıcı.", download_url: "https://laptop-updates.brave.com/latest/winx64", official_url: "https://brave.com/tr/" },
  { id: "mullvad", name: "Mullvad Browser", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*90, version: "13.0.x", description: "Gizlilik odaklı, güvenli tarayıcı.", download_url: "https://mullvad.net/en/download/browser/windows/latest", official_url: "https://mullvad.net/en/browser" },
  { id: "zen", name: "Zen Browser", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*110, version: "1.0.x", description: "Modern, hızlı ve kişiselleştirilebilir.", download_url: "https://github.com/zen-browser/desktop/releases/latest/download/zen.browser.setup-x64.exe", official_url: "https://zen-browser.app/" },
  { id: "tor", name: "Tor Browser", category: "Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024*1024*95, version: "13.0.x", description: "Anonimlik ve tam gizlilik tarayıcısı.", download_url: "https://www.torproject.org/dist/torbrowser/13.0.14/torbrowser-install-win64-13.0.14_ALL.exe", official_url: "https://www.torproject.org/" },

  // Communication
  { id: "discord", name: "Discord", category: "Sosyal & İletişim", category_order: 20, icon: "message", size_bytes: 1024*1024*85, version: "1.0.x", description: "Oyuncular için iletişim platformu.", download_url: "https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64", official_url: "https://discord.com/" },
  { id: "whatsapp", name: "WhatsApp", category: "Sosyal & İletişim", category_order: 20, icon: "message", size_bytes: 1024*1024*120, version: "2.24.x", description: "Mesajlaşma uygulaması.", download_url: "https://web.whatsapp.com/desktop/windows/release/x64/WhatsAppSetup.exe", official_url: "https://www.whatsapp.com/" },
  { id: "telegram", name: "Telegram", category: "Sosyal & İletişim", category_order: 20, icon: "message", size_bytes: 1024*1024*35, version: "4.15.x", description: "Güvenli ve hızlı mesajlaşma.", download_url: "https://telegram.org/dl/desktop/win64", official_url: "https://telegram.org/" },

  // Media
  { id: "vlc", name: "VLC Player", category: "Medya & Tasarım", category_order: 40, icon: "monitor", size_bytes: 1024*1024*42, version: "3.0.20", description: "Her türlü medyayı oynatın.", download_url: "https://get.videolan.org/vlc/last/win64/vlc-3.0.18-win64.exe", official_url: "https://www.videolan.org/vlc/" },
  { id: "spotify", name: "Spotify", category: "Medya & Tasarım", category_order: 40, icon: "monitor", size_bytes: 1024*1024*88, version: "1.2.x", description: "Sınırsız müzik ve podcast.", download_url: "https://download.scdn.co/SpotifySetup.exe", official_url: "https://www.spotify.com/" },
  { id: "handbrake", name: "HandBrake", category: "Medya & Tasarım", category_order: 40, icon: "monitor", size_bytes: 1024*1024*22, version: "1.7.x", description: "Video format dönüştürücü.", download_url: "https://github.com/HandBrake/HandBrake/releases/download/1.6.1/HandBrake-1.6.1-x86_64-Win_GUI.exe", official_url: "https://handbrake.fr/" },

  // Development
  { id: "vscode", name: "VS Code", category: "Yazılım & Geliştirme", category_order: 50, icon: "terminal", size_bytes: 1024*1024*90, version: "1.89.x", description: "En popüler kod editörü.", download_url: "https://update.code.visualstudio.com/latest/win32-x64-user/stable", official_url: "https://code.visualstudio.com/" },
  { id: "git", name: "Git", category: "Yazılım & Geliştirme", category_order: 50, icon: "terminal", size_bytes: 1024*1024*55, version: "2.44.x", description: "Versiyon kontrol sistemi.", download_url: "https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe", official_url: "https://git-scm.com/" },
  { id: "github", name: "GitHub Desktop", category: "Yazılım & Geliştirme", category_order: 50, icon: "terminal", size_bytes: 1024*1024*110, version: "3.3.x", description: "Görsel Git istemcisi.", download_url: "https://central.github.com/deployments/desktop/desktop/latest/win32/x64", official_url: "https://desktop.github.com/" },
  { id: "python", name: "Python", category: "Yazılım & Geliştirme", category_order: 50, icon: "terminal", size_bytes: 1024*1024*25, version: "3.12.x", description: "Çok amaçlı programlama dili.", download_url: "https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe", official_url: "https://www.python.org/" },

  // System & Tools
  { id: "archive", name: "7-Zip", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*2, version: "23.01", description: "Gelişmiş dosya sıkıştırıcı.", download_url: "https://www.7-zip.org/a/7z2301-x64.exe", official_url: "https://www.7-zip.org/" },
  { id: "winrar", name: "WinRAR", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*3, version: "7.0.x", description: "Profesyonel arşiv yönetimi.", download_url: "https://www.rarlab.com/rar/winrar-x64-624.exe", official_url: "https://www.rarlab.com/" },
  { id: "rufus", name: "Rufus", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*1, version: "4.4.x", description: "Format USB hazırlama aracı.", download_url: "https://github.com/pbatard/rufus/releases/download/v4.2/rufus-4.2.exe", launch_file: "rufus.exe", portable: true, official_url: "https://rufus.ie/tr/" },
  { id: "notepad", name: "Notepad++", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*4, version: "8.6.x", description: "Gelişmiş metin düzenleyici.", download_url: "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.5.7/npp.8.5.7.Installer.x64.exe", official_url: "https://notepad-plus-plus.org/" },
  { id: "powertoys", name: "PowerToys", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*150, version: "0.80.x", description: "Windows üretkenlik araçları.", download_url: "https://github.com/microsoft/PowerToys/releases/download/v0.74.0/PowerToysSetup-0.74.0-x64.exe", official_url: "https://learn.microsoft.com/en-us/windows/powertoys/" },
  { id: "hwinfo", name: "HWiNFO", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*10, version: "8.00", description: "Donanım analiz ve izleme.", download_url: "https://www.hwinfo.com/files/hwi_764.exe", official_url: "https://www.hwinfo.com/" },
  { id: "cpuz", name: "CPU-Z", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*2, version: "2.09", description: "İşlemci bilgi aracı.", download_url: "https://www.cpuid.com/downloads/cpu-z/cpu-z_2.07-en.exe", official_url: "https://www.cpuid.com/softwares/cpu-z.html" },
  { id: "gpuz", name: "GPU-Z", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*9, version: "2.58", description: "Ekran kartı bilgi aracı.", download_url: "https://www.techpowerup.com/download/techpowerup-gpu-z/", official_url: "https://www.techpowerup.com/gpuz/" },
  { id: "sdi", name: "Snappy Driver Installer", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*5, version: "1.17.8", description: "Gelişmiş sürücü yükleme ve güncelleme aracı.", download_url: "https://www.glenn.delahoy.com/downloads/sdio/SDIO_1.17.8.829.zip", launch_file: "SDIO_auto.bat", portable: true, official_url: "https://snappy-driver-installer.org/" },
  
  // Scripts
  { id: "mas", name: "Microsoft Activation Script", category: "Özel Betikler", category_order: 100, icon: "script", size_bytes: 0, version: "2.5.x", description: "Windows ve Office aktivasyon betiği.", script_cmd: "irm https://get.activated.win | iex", official_url: "https://massgrave.dev/" },
  { id: "officetoolplus", name: "Office Tool Plus", category: "Özel Betikler", category_order: 100, icon: "script", size_bytes: 0, version: "10.10", description: "Office indirme ve yönetim aracı.", script_cmd: "irm https://officetool.plus | iex", official_url: "https://officetool.plus/" },
  { id: "cttwin", name: "Chris Titus Tech's Windows Utility", category: "Özel Betikler", category_order: 100, icon: "script", size_bytes: 0, version: "2024.x", description: "Windows optimizasyon ve debloat aracı.", script_cmd: 'irm "https://christitus.com/win" | iex', official_url: "https://winutil.christitus.com/" },

  // Gaming
  { id: "steam", name: "Steam", category: "Oyun & Mağazalar", category_order: 80, icon: "gaming", size_bytes: 1024*1024*2, version: "Latest", description: "Dijital oyun kütüphanesi.", download_url: "https://repo.steampowered.com/windows/SteamSetup.exe", official_url: "https://store.steampowered.com/" },
  { id: "epic", name: "Epic Games", category: "Oyun & Mağazalar", category_order: 80, icon: "gaming", size_bytes: 1024*1024*150, version: "Latest", description: "Epic Games mağazası.", download_url: "https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi", official_url: "https://store.epicgames.com/tr" },
  { id: "gog", name: "GOG Galaxy", category: "Oyun & Mağazalar", category_order: 80, icon: "gaming", size_bytes: 1024*1024*220, version: "2.0.x", description: "Oyunı birleştiren platform.", download_url: "https://cdn.gog.com/open/galaxy/client/2.0.71.2/setup_galaxy_2.0.71.2.exe", official_url: "https://www.gog.com/galaxy" },

  // Office
  { id: "adobe", name: "Adobe Reader", category: "Ofis & Verimlilik", category_order: 30, icon: "file-text", size_bytes: 1024*1024*200, version: "2024.x", description: "PDF okuma ve düzenleme.", download_url: "https://get.adobe.com/tr/reader/", official_url: "https://www.adobe.com/tr/acrobat/pdf-reader.html" },

  // Security
  { id: "malwarebytes", name: "Malwarebytes", category: "Güvenlik & Gizlilik", category_order: 90, icon: "security", size_bytes: 1024*1024*120, version: "5.0.x", description: "Güçlü antivirüs ve temizleyici.", download_url: "https://downloads.malwarebytes.com/file/mb-windows", official_url: "https://www.malwarebytes.com/" },
  { id: "bitwarden", name: "Bitwarden", category: "Güvenlik & Gizlilik", category_order: 90, icon: "security", size_bytes: 1024*1024*85, version: "2024.x", description: "Şifre yönetim çözümü.", download_url: "https://vault.bitwarden.com/download/?app=desktop&platform=windows", official_url: "https://bitwarden.com/" },
  { id: "qbittorrent", name: "qBittorrent", category: "Güvenlik & Gizlilik", category_order: 90, icon: "security", size_bytes: 1024*1024*28, version: "4.6.x", description: "Hızlı torrent istemcisi.", download_url: "https://github.com/qbittorrent/qBittorrent/releases/download/release-4.5.5/qbittorrent_4.5.5_x64_setup.exe", official_url: "https://www.qbittorrent.org/" },

  // More Utilities
  { id: "teamviewer", name: "TeamViewer", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*35, version: "15.x", description: "Uzaktan masaüstü erişmi.", download_url: "https://download.teamviewer.com/download/TeamViewer_Setup_x64.exe", official_url: "https://www.teamviewer.com/tr/" },
  { id: "anydesk", name: "AnyDesk", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*5, version: "8.0.x", description: "Hızlı uzaktan erişim.", download_url: "https://download.anydesk.com/AnyDesk.exe", official_url: "https://anydesk.com/tr" },
  { id: "everything", name: "Everything", category: "Sistem Araçları", category_order: 70, icon: "settings", size_bytes: 1024*1024*2, version: "1.4.x", description: "Anlık dosya arama motoru.", download_url: "https://www.voidtools.com/Everything-1.4.1.1024.x64-Setup.exe", official_url: "https://www.voidtools.com/tr-tr/" },
  
  // Resources
  { id: "ninite", name: "Ninite", category: "Faydalı Kaynaklar", category_order: 110, icon: "globe", size_bytes: 0, version: "Web", description: "Toplu uygulama yükleme servisi.", official_url: "https://ninite.com/", is_resource: true },
  { id: "fmhy", name: "FMHY", category: "Faydalı Kaynaklar", category_order: 110, icon: "globe", size_bytes: 0, version: "Web", description: "Devasa internet araçları rehberi.", official_url: "https://fmhy.net/", is_resource: true }
];

function App() {
  const [installers, setInstallers] = useState(LEGENDARY_APPS.map(a => ({...a, path: a.id, dependencies: []})));
  const [selected, setSelected] = useState(new Set());
  const [installing, setInstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState(null);
  const [installStatus, setInstallStatus] = useState({});
  const [installedApps, setInstalledApps] = useState({}); // id -> version
  const [installProgress, setInstallProgress] = useState({ done: 0, total: 0 });
  const [appProgress, setAppProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState("studio");
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuHover, setMenuHover] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [diskUsage, setDiskUsage] = useState(null);

  const [activeCategory, setActiveCategory] = useState(() => {
    return localStorage.getItem("stash-zero-active-category") || null;
  });
  const [customArgs, setCustomArgs] = useState({});
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showControlCenter, setShowControlCenter] = useState(true);
  const [dnsOpen, setDnsOpen] = useState(false);
  const [logPanelHeight, setLogPanelHeight] = useState(220);
  const menuBarRef = useRef(null);
  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);
  const isResizingLog = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(220);
  
  // Sync installers if LEGENDARY_APPS changes (Dev/HMR)
  useEffect(() => {
    setInstallers(LEGENDARY_APPS.map(a => ({...a, path: a.id, dependencies: []})));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  // Log panel resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingLog.current) return;
      e.preventDefault();
      const delta = startY.current - e.clientY;
      const newHeight = Math.min(600, Math.max(100, startHeight.current + delta));
      setLogPanelHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isResizingLog.current) {
        isResizingLog.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startLogResize = useCallback((e) => {
    isResizingLog.current = true;
    startY.current = e.clientY;
    startHeight.current = logPanelHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [logPanelHeight]);

  // Load persistence and keyboard shortcuts
  useEffect(() => {
    const savedTheme = localStorage.getItem("stash-zero-theme");
    if (savedTheme) setCurrentTheme(savedTheme);

    const savedCleanup = localStorage.getItem("stash-zero-cleanup");
    if (savedCleanup) setAutoCleanup(JSON.parse(savedCleanup));

    const savedSound = localStorage.getItem("stash-zero-sound");
    if (savedSound) setSoundEnabled(JSON.parse(savedSound));

    const savedCategory = localStorage.getItem("stash-zero-active-category");
    if (savedCategory) setActiveCategory(savedCategory);

    // Handle Splashscreen: Initial load + 3.5s buffer for professional feel
    const timer = setTimeout(() => {
      invoke("close_splashscreen").catch(e => console.error("Splash error:", e));
    }, 3500); 

    const handleKeyDown = (e) => {
      // Search: Ctrl+F
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Select All: Ctrl+A
      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        // Only if not in search input
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          selectAll();
        }
      }
      // Install: F6
      if (e.key === "F6") {
        e.preventDefault();
        startInstall();
      }
      // Escape: Clear search / Close menu / Close modal
      if (e.key === "Escape") {
        setSearchTerm("");
        setOpenMenu(null);
        setShowSettings(false);
        setShowAbout(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [installers]);

  // Initial load
  useEffect(() => {
    const installersCount = installers.length;
    addLog(`${installersCount} adet efsane uygulama hazır.`, "info");
    
    // Set initial category
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }

    refreshInstalledStatus();
  }, []);

  // Listen for install progress events
  useEffect(() => {
    const unlisten = listen('install-progress', (event) => {
      const payload = event.payload;
      const { package_id, percentage, message } = payload;
      addLog(message, "process");
      if (percentage !== null) {
        setAppProgress(prev => ({ ...prev, [package_id]: percentage }));
      }
    });

    const unlistenScript = listen('script-log', (event) => {
      const { msg, log_type, session_active } = event.payload;
      addLog(msg, log_type || "process");
      if (session_active !== undefined) {
        setIsSessionActive(session_active);
      }
    });

    return () => {
      unlisten.then(f => f());
      unlistenScript.then(f => f());
    };
  }, []);

  const sendTerminalCommand = async () => {
    if (!terminalInput.trim()) return;
    try {
      addLog(`> ${terminalInput}`, "command");
      const cmd = terminalInput;
      setTerminalInput("");
      await invoke("send_script_input", { input: cmd });
    } catch (err) {
      addLog(`Girdi hatası: ${err}`, "error");
    }
  };

  const killActiveSession = async () => {
    try {
      await invoke("kill_script");
      setIsSessionActive(false);
      addLog("Oturum kullanıcı tarafından sonlandırıldı.", "info");
    } catch (err) {
      addLog(`Durdurma hatası: ${err}`, "error");
    }
  };

  // System Info Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await invoke("get_system_info");
        setSystemInfo(info);
      } catch (e) {
        console.error("System info error", e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Group installers by category
  const categories = useMemo(() => {
    const map = new Map();
    for (const app of installers) {
      const cat = app.category;
      if (!map.has(cat)) {
        map.set(cat, { name: cat, order: app.category_order, count: 0, icon: app.icon });
      }
      map.get(cat).count++;
    }
    const list = Array.from(map.values()).sort((a, b) => a.order - b.order);
    
    // Auto-set first category if none active or current one disappeared
    if (list.length > 0) {
      const exists = list.some(c => c.name === activeCategory);
      if (!activeCategory || !exists) {
        setActiveCategory(list[0].name);
        localStorage.setItem("stash-zero-active-category", list[0].name);
      }
    }
    return list;
  }, [installers, activeCategory]);

  const filteredApps = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return installers.filter(app => {
      const matchesSearch = !term || app.name.toLowerCase().includes(term);
      const matchesCategory = !activeCategory || app.category === activeCategory;
      return matchesSearch && (term ? matchesSearch : matchesCategory);
    });
  }, [installers, searchTerm, activeCategory]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const toggleSelect = async (path) => {
    if (installing) return;
    
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    sounds.playClick();
  };

  const refreshInstalledStatus = async () => {
    try {
      const systemApps = await invoke("get_installed_winget_ids"); // Array of [name, version]
      const newInstalledApps = {};
      
      for (const app of installers) {
        const lowerName = app.name.toLowerCase();
        const lowerId = app.id.toLowerCase();
        
        let match = systemApps.find(([name, _]) => {
           const lowerN = name.toLowerCase();
           return lowerN === lowerName || lowerN === lowerId || lowerN.includes(lowerName);
        });
        
        if (match) {
          newInstalledApps[app.id] = match[1] || "Kurulu";
        }
      }
      
      setInstalledApps(newInstalledApps);
    } catch (e) {
      console.error("Installation status check failed", e);
    }
  };

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 100));
  };

  const startUninstall = async (app) => {
    setInstalling(true);
    setShowLogs(true);
    addLog(`${app.name} kaldırılıyor...`, "process");
    
    try {
      if (app.portable) {
        await invoke("uninstall_portable", { url: app.download_url, appName: app.name });
        addLog(`Başarılı: ${app.name} silindi.`, "success");
      } else if (app.uninstall_path) {
        addLog(`> ${app.uninstall_path}`, "command");
        await invoke("uninstall_software", { path: app.uninstall_path });
        addLog(`Başarılı: ${app.name} sistemden kaldırıldı.`, "success");
      } else {
        throw new Error("Kaldırma yolu tanımlanmamış.");
      }
      refreshInstalledStatus();
      sounds.playSuccess();
    } catch (error) {
      addLog(`Hata: ${error}`, "error");
      sounds.playError();
    }
    setInstalling(false);
  };

  const startInstall = async () => {
    if (selected.size === 0 || installing) return;
    
    setInstalling(true);
    setShowLogs(true);
    addLog("Kurulum oturumu başladı.", "info");
    sounds.playClick();

    const selectedApps = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: selectedApps.length });

    for (let idx = 0; idx < selectedApps.length; idx++) {
      const app = selectedApps[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      addLog(`İşlem başlatılıyor: ${app.name}`, "process");
      
      try {
        if (app.script_cmd) {
          addLog(`> Betik çalıştırılıyor: ${app.script_cmd}`, "command");
          if (app.id === "officetoolplus") {
            await invoke("run_ps_script_logged", { script: app.script_cmd });
          } else {
            await invoke("run_ps_script", { script: app.script_cmd });
          }
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başlatıldı: ${app.name}`, "success");
        } else if (app.download_url) {
          addLog(`> curl ile indiriliyor: ${app.download_url}`, "command");
          await invoke("install_exe_from_url", { 
            url: app.download_url,
            packageId: app.id,
            appName: app.name,
            isPortable: !!app.portable
          });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başarılı: ${app.name}`, "success");
        }
        refreshInstalledStatus();
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
        addLog(`Hata (${app.name}): ${error}`, "error");
        sounds.playError();
      }
      setInstallProgress({ done: idx + 1, total: selectedApps.length });
    }

    addLog("Tüm işlemler tamamlandı.", "info");
    sounds.playSuccess();
    setCurrentInstall(null);
    setInstalling(false);
  };

  const selectAll = () => {
    if (installing) return;
    setSelected(new Set(installers.map((a) => a.path)));
  };

  const clearSelection = () => {
    if (installing) return;
    setSelected(new Set());
  };

  const handleMenuAction = async (action, data = null) => {
    setOpenMenu(null);
    sounds.playClick();
    switch (action) {
      case "export-bundle":
        if (selected.size === 0) return alert("Önce uygulama seçmelisiniz.");
        try {
          const exportPath = await save({
            title: "Paketi Kaydet",
            defaultPath: "bundle.stash",
            filters: [{ name: "Stash Bundle", extensions: ["stash"] }]
          });
          if (exportPath) {
             const bundle = {
               apps: Array.from(selected),
               customArgs
             };
             await writeTextFile(exportPath, JSON.stringify(bundle));
             addLog("Paket dışa aktarıldı.", "success");
          }
        } catch(e) { addLog(`Dışa aktarma hatası: ${e}`, "error"); }
        break;
      case "import-bundle":
        try {
           const importPath = await open({
             multiple: false,
             filters: [{ name: "Stash Bundle", extensions: ["stash"] }]
           });
           if (importPath) {
              const content = await readTextFile(importPath);
              const bundle = JSON.parse(content);
              setSelected(new Set(bundle.apps));
              if (bundle.customArgs) setCustomArgs(bundle.customArgs);
              addLog("Paket içe aktarıldı.", "success");
           }
        } catch(e) { addLog(`İçe aktarma hatası: ${e}`, "error"); }
        break;
      case "select-all":
        selectAll();
        break;
      case "clear-selection":
        clearSelection();
        break;
      case "start-install":
        startInstall();
        break;
      case "toggle-logs":
        setShowLogs(!showLogs);
        break;
      case "clear-logs":
        setLogs([]);
        break;
      case "show-settings":
        setShowSettings(true);
        break;
      case "change-theme":
        setCurrentTheme(data);
        localStorage.setItem("stash-zero-theme", data);
        break;
      case "exit":
        window.close();
        break;
      case "about":
        setShowAbout(true);
        break;
      default:
        break;
    }
  };

  const progressPercent =
    installProgress.total > 0
      ? Math.round((installProgress.done / installProgress.total) * 100)
      : 0;

  return (
    <div className={`app-layout theme-${currentTheme}`}>
      <div className="mesh-gradient" />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-wrapper">
            <svg width="80" height="80" viewBox="0 0 100 100" className="project-logo-svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ff9f" />
                  <stop offset="100%" stopColor="#00c9ff" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.3" strokeDasharray="10 5" />
              <path d="M50 15 A35 35 0 0 1 85 50 A35 35 0 0 1 50 85 A35 35 0 0 1 15 50 A35 35 0 0 1 50 15" fill="none" stroke="url(#logo-grad)" strokeWidth="3" filter="url(#glow)" />
              <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="url(#logo-grad)" strokeWidth="10" strokeLinecap="round" filter="url(#glow)" />
              <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            </svg>
            <div className="logo-glow" />
          </div>
          <h1>STASH<span>ZERO</span><span>STUDIO MASTER SÜRÜMÜ</span></h1>
        </div>
        
        <div className="sidebar-nav">
          {categories.map(cat => (
            <div 
              key={cat.name} 
              className={`sidebar-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => { 
                setActiveCategory(cat.name); 
                localStorage.setItem("stash-zero-active-category", cat.name);
                sounds.playClick(); 
              }}
            >
              <div className="sidebar-item-left">
                 <SidebarIcon type={cat.icon} />
                 <span>{cat.name}</span>
              </div>
              <span className="sidebar-count">{cat.count}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
           <div 
             className="sidebar-item" 
             onClick={() => handleMenuAction("show-settings")}
           >
             <span>Ayarlar</span>
           </div>
           <div 
             className="sidebar-item" 
             onClick={() => handleMenuAction("toggle-logs")}
           >
             <span>Loglar</span>
           </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-left">
             {/* Left side reserved or for branding */}
          </div>

          <div className="search-container">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             <input
               ref={searchInputRef}
               type="text"
               placeholder="Uygulama ara..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             {!searchTerm && <div className="search-shortcut">CTRL + F</div>}
          </div>

          <div className="top-right">
             {/* Telemetry is now persistent */}
          </div>
        </header>

        <div className="content-scroll">


          {filteredApps.length === 0 ? (
            <div className="empty-state">
              Görüntülenecek uygulama bulunamadı.
            </div>
          ) : (
            <div className="category-apps">
              {filteredApps.map((app) => {
                const isSelected = selected.has(app.path);
                const status = installStatus[app.path];
                let cardClass = "app-card";
                if (isSelected) cardClass += " selected";
                if (status === "installing") cardClass += " installing";
                if (status === "done" && !app.script_cmd) cardClass += " done";
                if (status === "error") cardClass += " error";
                if (installedApps[app.id] && !app.script_cmd) cardClass += " installed";
                if (app.is_resource) cardClass += " resource-vibe";

                return (
                  <div 
                    key={app.path} 
                    className={cardClass} 
                    onClick={() => {
                      if (app.is_resource && app.official_url) {
                        openUrl(app.official_url);
                      } else {
                        toggleSelect(app.path);
                      }
                    }}
                    onMouseMove={handleMouseMove}
                  >
                    <div className="app-icon">
                      <AppLogo id={app.id} className="brand-logo" />
                      {(installedApps[app.id] && !app.script_cmd) && (
                        <div className="installed-badge">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      )}
                    </div>
                    <div className="app-info">
                      <div className="app-name-row">
                        <span className="app-name">{app.name}</span>
                      </div>
                      
                      <div className="badges-row">
                        {app.portable && <span className="app-badge badge-portable">Taşınabilir</span>}
                        {(!app.is_resource && installedApps[app.id]) && <span className="app-badge badge-installed">Kurulu</span>}
                        <span className="app-badge badge-version">
                          {installedApps[app.id] && installedApps[app.id] !== "Portable" && installedApps[app.id] !== "Kurulu" 
                            ? installedApps[app.id] 
                            : app.version}
                        </span>
                        {!app.is_resource && !app.script_cmd && app.size_bytes && <span className="app-badge badge-size">{(app.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>}
                      </div>

                      <div className="app-description">
                        {app.description}
                      </div>

                      <div className="app-actions-top">
                        {app.official_url && (
                           <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); openUrl(app.official_url); }} title="Web Sitesi">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                           </button>
                        )}
                        {(installedApps[app.id] && !app.script_cmd) && (
                          <button className="icon-action-btn delete-vibe" onClick={(e) => { e.stopPropagation(); startUninstall(app); }} title="Kaldır">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                        {((installedApps[app.id] && app.portable && !app.script_cmd) || app.script_cmd) && (
                           <button 
                             className={`primary-launch-btn ${app.script_cmd ? 'script-vibe' : ''}`}
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               if(app.script_cmd) {
                                 const cmd = app.id === "officetoolplus" ? "run_ps_script_logged" : "run_ps_script";
                                 invoke(cmd, {script: app.script_cmd}).then(() => addLog(`${app.name} çalıştırılıyor...`, "success")).catch(err => addLog(`Hata: ${err}`, "error"));
                                 setShowLogs(true);
                               } else {
                                 invoke("launch_portable", {url: app.download_url, appName: app.name, launchFile: app.launch_file}).then(() => addLog(`${app.name} başlatılıyor...`, "success")).catch(err => addLog(`Hata: ${err}`, "error"));
                               }
                             }}
                           >
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                           </button>
                        )}
                      </div>
                    </div>
                    {status === "installing" && (
                      appProgress[app.path] !== undefined ? (
                        <div className="app-progress">
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${appProgress[app.path]}%` }} />
                          </div>
                          <span className="progress-percent">{appProgress[app.path]}%</span>
                        </div>
                      ) : (
                        <div className="spinner" />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {installers.length > 0 && !installing && (
          <div className="action-bar">
            <div className="selection-info">
              <strong>{selected.size}</strong> uygulama seçildi
            </div>
            <div className="action-btns">
              <button className="neon-button" onClick={clearSelection} disabled={selected.size === 0 || installing}>Seçimi Temizle</button>
              <button className="neon-button primary" onClick={startInstall} disabled={selected.size === 0 || installing}>
                {installing ? "Kuruluyor..." : "Sessiz Kurulum Başlat"}
              </button>
            </div>
          </div>
        )}
        {/* ─── Global Progress (Modern Bottom Bar) ─── */}
        {installing && (
          <div className="global-progress">
            <div className="progress-header">
              Kuruluyor: <strong>{currentInstall}</strong>
            </div>
            <div className="progress-container">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-percent-label">{installProgress.done}/{installProgress.total} • {progressPercent}%</div>
            </div>
          </div>
        )}

        {/* ─── Integrated Terminal (Docked at Bottom) ─── */}
        {showLogs && (
          <div className="log-panel" style={{ height: logPanelHeight }}>
            <div className="log-resize-handle" onMouseDown={startLogResize} />
            <div className="log-header">
              <span>Yükleme Günlüğü</span>
              <div className="log-actions">
                {isSessionActive && (
                  <>
                    <div className="session-badge">AKTİF OTURUM</div>
                    <button className="kill-session-btn" onClick={killActiveSession}>DURDUR</button>
                  </>
                )}
                <button className="icon-btn-sm" onClick={() => setLogs([])} title="Kayıtları Temizle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button className="icon-btn-sm close-btn" onClick={() => setShowLogs(false)} title="Günlüğü Kapat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            <div className="log-panel-inner" style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
              <div className="log-content">
                {logs.length === 0 ? (
                  <div className="log-empty">Henüz bir kayıt yok.</div>
                ) : (
                  logs.slice().reverse().map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className="log-msg">{log.msg}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
              
              {isSessionActive && (
                <div className="terminal-input-row" onClick={() => document.getElementById('term-input')?.focus()}>
                  <span className="terminal-prompt">PS &gt;</span>
                  <input 
                    id="term-input"
                    type="text" 
                    className="terminal-input" 
                    placeholder="Komut yazın ve Enter'a basın..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendTerminalCommand();
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Control Center (Right Sidebar) ─── */}
      {showControlCenter && (
        <aside className="control-center">
          <div className="cc-header">
            <h2>Sistem Telemetrisi</h2>
          </div>
          
          <div className="cc-content">
            {/* App Selection / Details Area */}
            <div className="cc-section">
              <h3 className="cc-section-title">Aktif Dosya Durumu</h3>
              <div className="file-status-list">
                <div className="file-status-item">
                  <span className="file-status-label">Seçilen</span>
                  <span className="file-status-value">{selected.size} Uygulama</span>
                </div>
                <div className="file-status-item">
                  <span className="file-status-label">Toplam Boyut</span>
                  <span className="file-status-value">{installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) > 0 
                    ? (installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) / (1024*1024)).toFixed(1) + " MB"
                    : "0 MB"}</span>
                </div>
              </div>
            </div>

            {/* Performance Telemetry */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Performans</h3>
                <div className="telemetry-grid">
                  <div className="telemetry-card">
                    <div className="tel-header">
                      <div className="tel-label-group">
                        <TelemetryIcon type="cpu" />
                        <span className="tel-label">İşlemci (CPU)</span>
                      </div>
                      <span className="tel-value">{Math.round(systemInfo.cpu_usage)}%</span>
                    </div>
                    <div className="tel-progress">
                      <div className="tel-fill" style={{ width: `${systemInfo.cpu_usage}%` }} />
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="tel-header">
                      <div className="tel-label-group">
                        <TelemetryIcon type="ram" />
                        <span className="tel-label">Bellek (RAM)</span>
                      </div>
                      <span className="tel-value">{Math.round((systemInfo.used_memory/systemInfo.total_memory)*100)}%</span>
                    </div>
                    <div className="tel-progress">
                      <div className="tel-fill" style={{ width: `${(systemInfo.used_memory/systemInfo.total_memory)*100}%` }} />
                    </div>
                  </div>
                  {systemInfo.disks && systemInfo.disks.map((disk, idx) => {
                    const used = disk.total_space - disk.available_space;
                    const pct = Math.round((used / disk.total_space) * 100);
                    return (
                      <div 
                        className="telemetry-card clickable" 
                        key={idx}
                        onClick={() => {
                          invoke("open_drive", { path: disk.mount_point });
                          sounds.playClick();
                        }}
                        title={`${disk.mount_point} Klasörünü Aç`}
                      >
                        <div className="tel-header">
                          <div className="tel-label-group">
                            <TelemetryIcon type="disk" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <span className="tel-label">{disk.name || disk.mount_point}</span>
                               <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{disk.model} ({disk.bus_type})</span>
                            </div>
                          </div>
                          <span className="tel-value">{pct}%</span>
                        </div>
                        <div className="tel-progress">
                          <div className="tel-fill" style={{ width: `${pct}%`, background: pct > 90 ? '#ff4757' : 'var(--accent-primary)' }} />
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                          {Math.round(used / (1024*1024*1024))} GB / {Math.round(disk.total_space / (1024*1024*1024))} GB
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Network */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Ağ Trafiği</h3>
                <div className="net-monitor">
                  <div className="net-stat download">
                    <div className="net-stat-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span>İndirme</span>
                    </div>
                    <span>{formatSpeed(systemInfo.net_in)}</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{width: `${Math.min(100, systemInfo.net_in / 10)}%`}}></div></div>
                  </div>
                  <div className="net-stat upload">
                    <div className="net-stat-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span>Yükleme</span>
                    </div>
                    <span>{formatSpeed(systemInfo.net_out)}</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{width: `${Math.min(100, systemInfo.net_out / 10)}%`}}></div></div>
                  </div>
                </div>
              </div>
            )}

            {/* System Details */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Sistem Özellikleri</h3>
                <div className="specs-list">
                  <div className="spec-item os-section">
                    <div className="os-header">
                      <span className="spec-key">İşletim Sistemi</span>
                      <div className="os-statuses">
                        <span className={`status-badge ${systemInfo.uefi_boot ? 'on' : 'off'}`} title="Modern sistem önyükleme standardı.">UEFI Boot</span>
                        <span className={`status-badge ${systemInfo.secure_boot ? 'on' : 'off'}`} title="Güvenli önyükleme; sadece dijital imzalı yazılımların başlamasına izin verir.">Secure Boot</span>
                      </div>
                    </div>
                    <span className="spec-val large" title={systemInfo.os_version}>{systemInfo.os_version}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">İşlemci Modeli</span>
                    <span className="spec-val" title={systemInfo.cpu_model}>{systemInfo.cpu_model}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Grafik Kartı (GPU)</span>
                    <span className="spec-val" title={systemInfo.gpu_model}>{systemInfo.gpu_model}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Anakart</span>
                    <span className="spec-val" title={systemInfo.motherboard}>{systemInfo.motherboard}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">BIOS</span>
                    <span className="spec-val" title={systemInfo.bios_info}>{systemInfo.bios_info}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Toplam Bellek</span>
                    <span className="spec-val">{Math.round(systemInfo.total_memory / (1024*1024*1024))} GB</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Yerel IP</span>
                    <span className="spec-val">{systemInfo.local_ip}</span>
                  </div>
                  <div className="spec-item" style={{ position: 'relative' }}>
                    <span className="spec-key">DNS Sunucuları</span>
                    <span 
                      className="spec-val" 
                      style={{ fontSize: '10px', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} 
                      title={systemInfo.dns_servers}
                      onClick={(e) => { e.stopPropagation(); setDnsOpen(!dnsOpen); }}
                    >
                      {(() => {
                        const activeDns = POPULAR_DNS.find(d => systemInfo.dns_servers.includes(d.ips[0]));
                        return activeDns && (
                          <img 
                            src={SPECIAL_LOGOS[activeDns.slug] || `https://cdn.simpleicons.org/${activeDns.slug}`} 
                            alt={activeDns.name} 
                            style={{ width: '12px', height: '12px', filter: 'drop-shadow(0 0 5px var(--accent-glow))' }} 
                          />
                        );
                      })()}
                      {systemInfo.dns_servers}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.5, transform: dnsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                    
                    {dnsOpen && (
                      <div className="dns-quick-list" onClick={(e) => e.stopPropagation()}>
                        <div className="dns-quick-header">
                           <span>DNS Değiştirici</span>
                           <button onClick={() => setDnsOpen(false)}>&times;</button>
                        </div>
                        {POPULAR_DNS.map(dns => (
                          <div 
                            key={dns.name} 
                            className="dns-quick-item"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                addLog(`${dns.name} DNS uygulanıyor...`, "process");
                                await invoke("set_dns", { dns: dns.ips });
                                addLog(`${dns.name} DNS başarıyla ayarlandı.`, "success");
                                sounds.playSuccess();
                                // Immediate UI update
                                setSystemInfo(prev => prev ? { ...prev, dns_servers: dns.ips.join(", ") } : prev);
                                setDnsOpen(false);
                              } catch (err) {
                                addLog(`DNS Hatası: ${err}`, "error");
                                sounds.playError();
                              }
                            }}
                          >
                            <div className="dns-q-header-row">
                              <img src={SPECIAL_LOGOS[dns.slug] || `https://cdn.simpleicons.org/${dns.slug}`} alt={dns.name} className="dns-q-icon" />
                              <span className="dns-q-name">{dns.name}</span>
                            </div>
                            <span className="dns-q-ips">{dns.ips[0]}</span>
                          </div>
                        ))}
                        <div 
                          className="dns-quick-item reset"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              addLog("DNS ayarları sıfırlanıyor...", "process");
                              await invoke("reset_dns");
                              addLog("DNS ayarları otomatiğe döndürüldü.", "success");
                              sounds.playSuccess();
                              // Refresh DNS in UI
                              setTimeout(async () => {
                                const info = await invoke("get_system_info");
                                setSystemInfo(info);
                              }, 500);
                              setDnsOpen(false);
                            } catch (err) {
                              addLog(`DNS Hatası: ${err}`, "error");
                            }
                          }}
                        >
                          Otomatik DNS'e Dön
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </aside>
      )}

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Stash Ayarları</h2>
              <button className="close-btn circle modern-modal-close" onClick={() => setShowSettings(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body settings-body">
              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title">Otomatik Temizlik</span>
                  <span className="setting-desc">Kurulum bittikten sonra inen kalıntı dosyaları otomatik siler.</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={autoCleanup} 
                    onChange={(e) => {
                       setAutoCleanup(e.target.checked);
                       localStorage.setItem("stash-zero-cleanup", JSON.stringify(e.target.checked));
                    }} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title">Ses Efektleri</span>
                  <span className="setting-desc">Etkileşimlerde ufak ses bildirimleri çalınsın.</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={soundEnabled} 
                    onChange={(e) => {
                       setSoundEnabled(e.target.checked);
                       sounds.setEnabled(e.target.checked);
                       localStorage.setItem("stash-zero-sound", JSON.stringify(e.target.checked));
                    }} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-card col">
                <div className="setting-info">
                  <span className="setting-title">Tema Seçimi</span>
                  <span className="setting-desc">Uygulama arayüzünün estetiğini belirleyin.</span>
                </div>
                <div className="theme-selector modern">
                  <button className={currentTheme === "neon" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "neon")}>Neon</button>
                  <button className={currentTheme === "sleek" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "sleek")}>Sleek</button>
                  <button className={currentTheme === "cyber" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "cyber")}>Cyber</button>
                </div>
              </div>



            </div>
            <div className="modal-footer">
              <button className="neon-button primary custom-save-btn" onClick={() => setShowSettings(false)}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>StashZero Hakkında</h2>
              <button className="close-btn" onClick={() => setShowAbout(false)}>&times;</button>
            </div>
            <div className="modal-body about-body">
              <div className="about-branding">
                <svg width="60" height="60" viewBox="0 0 100 100">
                  <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#00ff9f" strokeWidth="10" strokeLinecap="round" />
                </svg>
                <div className="about-title">
                  <h3>STASH<span>ZERO</span></h3>
                  <p>Studio Master Sürümü</p>
                </div>
              </div>
              <div className="about-info-grid">
                <div className="info-item">
                  <span className="label">Geliştirici</span>
                  <span className="value">byGOG</span>
                </div>
                <div className="info-item">
                  <span className="label">Sürüm</span>
                  <span className="value">v1.0.0 (Master)</span>
                </div>
                <div className="info-item">
                  <span className="label">Mimari</span>
                  <span className="value">Tauri 2.5 + React 18 (Turbo)</span>
                </div>
                <div className="info-item">
                  <span className="label">Motor</span>
                  <span className="value">Rust (Yüksek Performans)</span>
                </div>
              </div>
              <div className="about-desc">
                StashZero, modern ve hız odaklı bir çevrimdışı uygulama kütüphanesidir. 
                Gelişmiş telemetri hub'ı ve tek tıkla kurulum özelliği ile 
                profesyonel kullanıcılar için tasarlanmış bir "Ninite" klonudur.
              </div>
              <div className="about-copyright">
                © 2026 byGOG Software. Tüm hakları saklıdır.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

pub mod sysinfo;
pub mod installer;
pub mod scripts;
pub mod network;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

static QUIT_REQUESTED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
  // Get windows
  if let Some(splash_window) = window.get_webview_window("splash") {
    splash_window.close().unwrap();
  }
  if let Some(main_window) = window.get_webview_window("main") {
    main_window.show().unwrap();
    main_window.maximize().unwrap();
  }
}

fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        if !window.is_visible().unwrap_or(false) {
            let _ = window.show();
        }
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
        }
        let _ = window.set_focus();
    }
}

fn hide_main_window(window: &tauri::WebviewWindow) {
    let _ = window.set_skip_taskbar(true);
    let _ = window.hide();
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        let minimized = window.is_minimized().unwrap_or(false);
        if visible && !minimized {
            hide_main_window(&window);
        } else {
            reveal_main_window(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        let existing = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        let flags = "--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows";
        let combined = if existing.is_empty() {
            flags.to_string()
        } else {
            format!("{existing} {flags}")
        };
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", combined);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Debug).build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            reveal_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            sysinfo::prefetch_static_info();

            let show_i = MenuItem::with_id(app, "show", "StashZero'yu Göster", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("StashZero")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        QUIT_REQUESTED.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    "show" => reveal_main_window(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }

            builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" && !QUIT_REQUESTED.load(Ordering::SeqCst) {
                    log::info!("Ana pencere gizleniyor...");
                    let _ = window.set_skip_taskbar(true);
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            sysinfo::get_system_info,
            sysinfo::get_fast_telemetry,
            sysinfo::get_slow_telemetry,
            installer::get_installed_winget_ids,
            installer::install_exe_from_url,
            installer::uninstall_software,
            installer::uninstall_portable,
            installer::launch_portable,
            installer::check_path_exists,
            scripts::open_drive,
            network::set_dns,
            network::reset_dns,
            scripts::run_ps_script,
            scripts::run_shell_script_logged,
            scripts::send_script_input,
            scripts::kill_script,
            scripts::open_uac_settings,
            scripts::open_defender_settings,
            scripts::set_uac_level,
            scripts::set_windows_theme,
            scripts::set_desktop_icon_visibility,
            scripts::open_desktop_icon_settings,
            scripts::open_power_settings,
            scripts::ensure_terminal_session,
            close_splashscreen
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                if !QUIT_REQUESTED.load(Ordering::SeqCst) {
                    api.prevent_exit();
                }
            }
            _ => {}
        });
}

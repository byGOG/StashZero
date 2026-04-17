pub mod sysinfo;
pub mod installer;
pub mod scripts;
pub mod network;

use tauri::Manager;

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

use tray_icon::TrayIconBuilder;
use muda::{Menu, MenuItem};



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Debug).build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            sysinfo::prefetch_static_info();

            let quit_i = MenuItem::new("Çıkış", true, None);
            let show_i = MenuItem::new("StashZero'yu Göster", true, None);
            let menu = Menu::new();
            let _ = menu.append(&show_i);
            let _ = menu.append(&quit_i);

            // Icon conversion for tray-icon crate
            let tray_icon = if let Some(icon) = app.default_window_icon() {
                let rgba = icon.rgba();
                let width = icon.width();
                let height = icon.height();
                tray_icon::Icon::from_rgba(rgba.to_vec(), width, height).ok()
            } else {
                None
            };

            let mut tray_builder = TrayIconBuilder::new()
                .with_menu(Box::new(menu));
            
            if let Some(icon) = tray_icon {
                tray_builder = tray_builder.with_icon(icon);
            }

            let tray = tray_builder.build()?;
            Box::leak(Box::new(tray));

            // Handle tray menu events
            let quit_i_id = quit_i.id().clone();
            let show_i_id = show_i.id().clone();
            
            let app_handle_menu = app.handle().clone();
            std::thread::spawn(move || {
                let receiver = muda::MenuEvent::receiver();
                while let Ok(event) = receiver.recv() {
                    if event.id == quit_i_id {
                        std::process::exit(0);
                    } else if event.id == show_i_id {
                        if let Some(window) = app_handle_menu.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            });

            // Handle tray icon clicks
            let app_handle_tray = app.handle().clone();
            std::thread::spawn(move || {
                let receiver = tray_icon::TrayIconEvent::receiver();
                while let Ok(event) = receiver.recv() {
                    if let tray_icon::TrayIconEvent::Click { 
                        button: tray_icon::MouseButton::Left, 
                        .. 
                    } = event {
                        if let Some(window) = app_handle_tray.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" {
                    log::info!("Ana pencere gizleniyor...");
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            sysinfo::get_system_info,
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
                api.prevent_exit();
            }
            _ => {}
        });
}

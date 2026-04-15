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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Debug).build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            sysinfo::prefetch_static_info();
            Ok(())
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
            scripts::run_ps_script_logged,
            scripts::send_script_input,
            scripts::kill_script,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

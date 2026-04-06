use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Paths received via `RunEvent::Opened` before the frontend is ready.
static PENDING_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[tauri::command]
fn get_pending_files() -> Vec<String> {
    let mut pending = PENDING_FILES.lock().unwrap();
    std::mem::take(&mut *pending)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_app_data(app: tauri::AppHandle, key: String) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file = dir.join(format!("{}.json", key));
    std::fs::read_to_string(&file).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_app_data(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(format!("{}.json", key)), value).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // On Windows/Linux, file path comes as CLI argument
            #[cfg(not(target_os = "macos"))]
            {
                let files: Vec<String> = std::env::args()
                    .skip(1)
                    .filter(|a| !a.starts_with('-'))
                    .filter(|a| a.ends_with(".mdxx"))
                    .collect();
                if !files.is_empty() {
                    if let Some(window) = app.get_webview_window("main") {
                        let files_json = serde_json::to_string(&files).unwrap_or_default();
                        let _ = window.eval(&format!(
                            "window.__TAURI_OPENED_FILES__ = {};",
                            files_json
                        ));
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_app_data,
            write_app_data,
            get_pending_files
        ])
        .build(tauri::generate_context!())
        .expect("error building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = &event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|p| p.to_string_lossy().into_owned())
                .collect();

            if paths.is_empty() {
                return;
            }

            // Store paths so the frontend can retrieve them on mount
            // (covers cold-launch where the event fires before the JS listener is ready).
            PENDING_FILES.lock().unwrap().extend(paths.clone());

            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.emit("file-opened", &paths);
            }
        }

        // Suppress unused variable warnings
        let _ = app_handle;
        let _ = &event;
    });
}

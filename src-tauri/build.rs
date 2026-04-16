fn main() {
  let mut attributes = tauri_build::Attributes::new();
  
  if std::env::var("CARGO_CFG_TARGET_OS").unwrap() == "windows" {
    attributes = attributes.windows_attributes(
      tauri_build::WindowsAttributes::new().app_manifest(
        std::fs::read_to_string("app.manifest").expect("failed to read app.manifest")
      )
    );
  }

  tauri_build::try_build(attributes).expect("failed to run build script");
}

use std::{
    fs,
    path::PathBuf,
    process::{Command, Output},
    sync::atomic::{AtomicUsize, Ordering},
};
static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Case {
    root: PathBuf,
    day: String,
}
impl Case {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "pizdato-morning-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(root.join("vault/published/telegram")).unwrap();
        fs::create_dir_all(root.join("state")).unwrap();
        let date = Command::new("date")
            .env("TZ", "Europe/Berlin")
            .arg("+%F")
            .output()
            .unwrap();
        Self {
            root,
            day: String::from_utf8(date.stdout).unwrap().trim().to_owned(),
        }
    }
    fn marker(&self) -> PathBuf {
        self.root
            .join(format!("vault/published/telegram/morning-{}.md", self.day))
    }
    fn run(&self, args: &[&str]) -> Output {
        Command::new("bash")
            .arg("deploy/morning/run.sh")
            .args(args)
            .env("PIZDATO_MORNING_VAULT", self.root.join("vault"))
            .env("PIZDATO_MORNING_STATE", self.root.join("state"))
            .env("PIZDATO_MORNING_NODE", self.root.join("runtime"))
            .output()
            .unwrap()
    }
    fn runtime(&self, body: &str) {
        use std::os::unix::fs::PermissionsExt;
        let p = self.root.join("runtime");
        fs::write(
            &p,
            format!(
                "#!/bin/bash\nprintf '%s\\n' \"$@\" > '{}'\n{}\n",
                self.root.join("prompt.txt").display(),
                body
            ),
        )
        .unwrap();
        fs::set_permissions(p, fs::Permissions::from_mode(0o700)).unwrap();
    }
}
impl Drop for Case {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}
#[test]
fn already_published_skips_the_runtime() {
    let c = Case::new();
    fs::write(c.marker(), "message_id: 158\n").unwrap();
    let out = c.run(&[]);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(!c.root.join("prompt.txt").exists());
}
#[test]
fn runtime_failure_is_reported() {
    let c = Case::new();
    c.runtime("exit 42");
    let out = c.run(&[]);
    assert!(!out.status.success());
    assert!(
        c.root.join("prompt.txt").exists(),
        "runtime must actually run"
    );
}
#[test]
fn live_success_requires_a_publication_marker() {
    let c = Case::new();
    c.runtime("exit 0");
    assert!(!c.run(&[]).status.success());
}
#[test]
fn dry_run_forbids_publication_and_needs_no_marker() {
    let c = Case::new();
    c.runtime("exit 0");
    let out = c.run(&["--dry-run"]);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let prompt = fs::read_to_string(c.root.join("prompt.txt")).unwrap();
    assert!(prompt.contains("--dry-run"));
    assert!(!c.marker().exists());
}
#[test]
fn uncertain_send_blocks_the_runtime() {
    let c = Case::new();
    c.runtime("exit 0");
    fs::write(
        c.root.join(format!("state/morning-{}.pending", c.day)),
        "send started",
    )
    .unwrap();
    let out = c.run(&[]);
    assert!(!out.status.success());
    assert!(!c.root.join("prompt.txt").exists());
}
#[test]
fn concurrent_execution_skips_the_runtime() {
    let c = Case::new();
    c.runtime("exit 0");
    let mut holder = Command::new("flock")
        .args(["-x"])
        .arg(c.root.join("state/run.lock"))
        .args(["bash", "-c"])
        .arg(format!(
            "touch '{}'; read -r _",
            c.root.join("locked").display()
        ))
        .stdin(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    for _ in 0..100 {
        if c.root.join("locked").exists() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    assert!(c.root.join("locked").exists());
    let out = c.run(&[]);
    drop(holder.stdin.take());
    holder.wait().unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(!c.root.join("prompt.txt").exists());
}
#[test]
fn confirmed_publication_completes_successfully() {
    let c = Case::new();
    c.runtime(&format!(
        "printf 'message_id: 159\\n' > '{}'",
        c.marker().display()
    ));
    assert!(c.run(&[]).status.success());
    assert!(c.marker().exists());
}
#[test]
fn preflight_is_read_only() {
    let c = Case::new();
    c.runtime("exit 0");
    let out = c.run(&["--check"]);
    assert!(out.status.success());
    let prompt = fs::read_to_string(c.root.join("prompt.txt")).unwrap();
    assert!(prompt.contains("--check"));
    assert!(!c.marker().exists());
}

#[test]
fn morning_message_has_restrained_decoration_without_promotion() {
    let result = Command::new("node")
        .args(["--input-type=module", "-e", "import {renderWisdom} from './deploy/morning/agent.mjs'; process.stdout.write(renderWisdom('wisdom', 'wish'));"])
        .output().unwrap();
    assert!(result.status.success());
    let text = String::from_utf8(result.stdout).unwrap();
    assert!(text.starts_with("☕ "));
    assert!(text.contains("\n\n✨ wish"));
    assert!(!text.contains("http"));
}

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
            "pizdato-evening-{}-{}",
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
            .join(format!("vault/published/telegram/evening-{}.md", self.day))
    }
    fn run(&self, args: &[&str]) -> Output {
        Command::new("bash")
            .arg("deploy/evening/run.sh")
            .args(args)
            .env("PIZDATO_EVENING_VAULT", self.root.join("vault"))
            .env("PIZDATO_EVENING_STATE", self.root.join("state"))
            .env("PIZDATO_EVENING_NODE", self.root.join("runtime"))
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
        c.root.join(format!("state/evening-{}.pending", c.day)),
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
fn editorial_repairs_preserve_three_subject_opportunities() {
    let out = Command::new("node")
        .args(["--input-type=module", "-e", r#"
import assert from 'node:assert/strict';
import {createGate,assertApproved} from './deploy/editorial/gate.mjs';
let calls=0;
const gate=createGate({history:[],request:async()=>({content:JSON.stringify({decision:++calls===9?'approve':'revise',grammar:calls===9,meaning:true,freshness:true,voice:true,grounding:true,issues:calls===9?[]:['Wrong agreement']})})});
for(let i=1;i<=9;i++) {
 const verdict=await gate.review({text:'payload '+i,wisdom:'wisdom '+i});
 if(i<9) assert.equal(verdict.nextAction,i%3===0?'replace':'repair');
 else assert.doesNotThrow(()=>assertApproved('payload 9',verdict));
}
assert.equal(calls,9);
"#])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn persistent_evening_policy_survives_twelve_repairs_and_restart() {
    let out = Command::new("node")
        .args(["--input-type=module", "-e", r#"
import assert from 'node:assert/strict';
import {createGate,assertApproved} from './deploy/editorial/gate.mjs';
let saved;
for(let i=0;i<=12;i++) {
 const gate=createGate({policy:'persistent-evening',initial:saved,history:[],request:async()=>({content:JSON.stringify({decision:i===12?'approve':'revise',grammar:i===12,meaning:true,freshness:true,voice:true,grounding:true,issues:i===12?[]:['Fix agreement']})})});
 const verdict=await gate.review({text:'draft '+i,wisdom:'wisdom '+i});
 if(i<12) {assert.equal(verdict.nextAction,'repair');assert.equal(gate.state.story,1);}
 else assertApproved('draft 12',verdict);
 saved=gate.snapshot();
}
"#])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn durable_worker_keeps_repairing_across_process_activations() {
    let out = Command::new("node")
        .args(["--test", "deploy/editorial/test/delivery.test.mjs"])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn durable_cli_initializes_future_schedule_and_does_not_publish_early() {
    let c = Case::new();
    for args in [vec!["--init", "2099-01-01"], vec!["tick"], vec!["--status"]] {
        let out = Command::new("bash")
            .arg("deploy/evening/tick.sh")
            .args(args)
            .env("PIZDATO_EVENING_VAULT", c.root.join("vault"))
            .env("PIZDATO_EVENING_STATE", c.root.join("state"))
            .env("PIZDATO_CHANNEL_ENV", c.root.join("missing"))
            .env("PIZDATO_EVENING_ENV", c.root.join("missing"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
    assert!(c.root.join("state/scheduler.json").exists());
    assert!(!c.marker().exists());
}

#[test]
fn durable_cli_refuses_to_use_live_state_as_dry_run_state() {
    let c = Case::new();
    fs::write(
        c.root.join("state/scheduler.json"),
        "{\"version\":1,\"activationDate\":\"2026-10-09\"}",
    )
    .unwrap();
    let out = Command::new("bash")
        .arg("deploy/evening/tick.sh")
        .arg("--dry-run")
        .arg(c.root.join("state"))
        .env("PIZDATO_EVENING_STATE", c.root.join("state"))
        .output()
        .unwrap();
    assert!(!out.status.success());
    assert!(!c.marker().exists());
    assert!(!c.root.join("state/run.lock").exists());
}

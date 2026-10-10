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
import channel from './deploy/editorial/profiles/pizdato-channel.mjs';
let calls=0;
const gate=createGate({profile:channel,history:[],request:async(m,o)=>o.title==='pizdato-verifier'?{content:JSON.stringify({verdicts:JSON.parse(m[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'ok'}))})}:o.title==='pizdato-proofreader'?{content:'{"issues":[]}'}:({content:JSON.stringify({issues:++calls===9?[]:[{category:'grammar',quote:'payload',problem:'Wrong agreement',fix:'Agree'}]})})});
for(let i=1;i<=9;i++) {
 const verdict=await gate.review({text:'payload '+i,fields:{wisdom:'wisdom '+i}});
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
fn persistent_evening_policy_replaces_a_stuck_story_and_survives_restart() {
    let out = Command::new("node")
        .args(["--input-type=module", "-e", r#"
import assert from 'node:assert/strict';
import {createGate,assertApproved} from './deploy/editorial/gate.mjs';
import channel from './deploy/editorial/profiles/pizdato-channel.mjs';
let saved;const actions=[];
for(let i=0;i<=7;i++) {
 const gate=createGate({profile:channel,policy:'persistent-evening',initial:saved,history:[],request:async(m,o)=>o.title==='pizdato-verifier'?{content:JSON.stringify({verdicts:JSON.parse(m[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'ok'}))})}:o.title==='pizdato-proofreader'?{content:'{"issues":[]}'}:({content:JSON.stringify({issues:i===7?[{category:'humor',quote:'',problem:'Optional polish',fix:'Sharper'}]:[{category:'grammar',quote:'draft',problem:'Fix agreement',fix:'Agree'}]})})});
 const verdict=await gate.review({text:'draft '+i,fields:{wisdom:'wisdom '+i}});
 actions.push(verdict.nextAction);
 if(i===7) assertApproved('draft 7',verdict);
 saved=gate.snapshot();
}
assert.deepEqual(actions,['repair','repair','repair','repair','replace','repair','repair','publish']);
assert.equal(saved.story,2);assert.equal(saved.abandoned[0].text,'draft 4');
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
            .env("PIZDATO_EVENING_NODE", "node")
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
        .env("PIZDATO_EVENING_NODE", "node")
        .arg("--dry-run")
        .arg(c.root.join("state"))
        .env("PIZDATO_EVENING_STATE", c.root.join("state"))
        .output()
        .unwrap();
    assert!(!out.status.success());
    assert!(!c.marker().exists());
    assert!(!c.root.join("state/run.lock").exists());
}

#[test]
fn separate_worker_processes_keep_one_draft_and_send_once() {
    let c = Case::new();
    let mut phases = Vec::new();
    for attempt in 0..=5 {
        let out = Command::new("node")
            .arg("deploy/editorial/test/durable-process.mjs")
            .arg(&c.root)
            .arg(attempt.to_string())
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        phases.push(String::from_utf8(out.stdout).unwrap().trim().to_owned());
    }
    assert_eq!(
        phases,
        [
            "repairing",
            "repairing",
            "repairing",
            "published",
            "idle",
            "idle"
        ]
    );
    assert_eq!(fs::read_to_string(c.root.join("sends")).unwrap(), "send\n");
}

// A copy of deploy/ whose channel profile has `from` replaced by `to`; returns the copy root.
fn broken_release(c: &Case, from: &str, to: &str) -> PathBuf {
    let copy = c.root.join("release");
    let _ = fs::remove_dir_all(&copy);
    fs::create_dir_all(&copy).unwrap();
    assert!(Command::new("cp")
        .args(["-r", "deploy"])
        .arg(&copy)
        .status()
        .unwrap()
        .success());
    let profile = copy.join("deploy/editorial/profiles/pizdato-channel.mjs");
    let text = fs::read_to_string(&profile).unwrap();
    assert!(text.contains(from));
    fs::write(&profile, text.replace(from, to)).unwrap();
    copy
}

// A lost slot and a profile of the wrong shape (which must not crash at import) both fail as configuration errors.
const BROKEN: [(&str, &str, &str); 2] = [
    ("  editorRole:", "  editorRoleRenamed:", "editorRole"),
    (
        "suggestions:Object.freeze(['wisdom'])",
        "suggestions:null",
        "suggestion",
    ),
];

#[test]
fn broken_profile_fails_every_evening_check() {
    let c = Case::new();
    for (from, to, named) in BROKEN {
        let copy = broken_release(&c, from, to);
        for script in ["run.sh", "tick.sh"] {
            let out = Command::new("bash")
                .arg(copy.join("deploy/evening").join(script))
                .arg("--check")
                .env("PIZDATO_EVENING_NODE", "node")
                .env("PIZDATO_EVENING_VAULT", c.root.join("vault"))
                .env("PIZDATO_EVENING_STATE", c.root.join("state"))
                .env("PIZDATO_CHANNEL_ENV", c.root.join("missing"))
                .env("PIZDATO_EVENING_ENV", c.root.join("missing"))
                .env("OPENROUTER_API_KEY", "test")
                .env("COMPOSIO_CONSUMER_KEY", "test")
                .output()
                .unwrap();
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(!out.status.success(), "{}: {}", script, stdout);
            assert!(
                stderr.contains("EDITORIAL_CONFIG") && stderr.contains(named),
                "{}: {}",
                script,
                stderr
            );
            assert!(!stdout.contains("PREFLIGHT_OK"), "{}: {}", script, stdout);
        }
    }
}

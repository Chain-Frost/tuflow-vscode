"""Portable PR #34 acceptance-launcher regression tests (no VS Code required)."""
import importlib.util
from pathlib import Path
import unittest

source = Path(__file__).with_name("run_local.py")
spec = importlib.util.spec_from_file_location("issue9_run_local", source)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def test_valid_canonical_allow_blocked(self):
        r = {"finishedAt":"now","environment":{"invocationId":"id"},
             "summary":{"pass":20,"fail":0,"blocked":1,"unverified":3},
             "checks":[{"status":"pass"},{"status":"blocked"},{"status":"unverified"}]}
        self.assertEqual(launcher.acceptance_failures(r,"id"),[])
        self.assertEqual(launcher.verify_outcome(r,"id",0,source)["fail"],0)

    def test_old_invocation_rejected(self):
        r = {"finishedAt":"old","environment":{"invocationId":"old"},
             "summary":{"pass":20,"fail":0}}
        with self.assertRaisesRegex(RuntimeError,"another invocation"):
            launcher.verify_outcome(r,"new",0,source)

    def test_failed_canonical_assertions(self):
        r = {"finishedAt":"now","summary":{"pass":19,"fail":1},
             "checks":[{"status":"fail"}]}
        with self.assertRaisesRegex(RuntimeError,"failed"):
            launcher.verify_outcome(r,"new",0,source)

    def test_nonzero_host_exit(self):
        r = {"finishedAt":"now","summary":{"pass":30,"fail":0}}
        with self.assertRaisesRegex(RuntimeError,"exit code: 3"):
            launcher.verify_outcome(r,"new",3,source)

    def test_supplemental_failure_variants(self):
        for r in [
            {"finishedAt":"now","summary":{"pass":False,"error":None}},
            {"finishedAt":"now","summary":{"checks":2,"failed":1},
             "checks":[{"status":"PASS"},{"status":"FAIL"}]},
            {"finishedAt":"now","summary":{"models":1,"error":"boom"}},
            {"finishedAt":"now","summary":{"commandCompleted":True,
                                            "nativeBrowserHandoff":False}},
            {"finishedAt":"now","summary":{"models":1},
             "models":[{"unchanged":False}]}
        ]:
            with self.subTest(report=r):
                self.assertTrue(launcher.acceptance_failures(r,"new"))

    def test_unverified_trial_allowed_explicitly(self):
        r = {"finishedAt":"now","summary":{"trials":2,"pass":1},
             "trials":[{"status":"PASS"},{"status":"UNVERIFIED"}]}
        self.assertEqual(launcher.acceptance_failures(r,"new"),[])

    def test_incomplete_report_rejected(self):
        self.assertTrue(launcher.acceptance_failures({"summary":{"pass":5}},"new"))
        self.assertTrue(launcher.acceptance_failures({"finishedAt":"now"},"new"))


if __name__ == "__main__":
    unittest.main()

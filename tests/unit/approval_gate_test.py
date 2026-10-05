import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('approval', '.ai/scripts/validate_implementation_approval.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ApprovalGate(unittest.TestCase):
    def record(self, gate='DEGRADED', status='APPROVED', reviewed='YES', brief='docs/plans/SM-FOUNDATION-001.md'):
        content = f'''Plan ID/version: TEST
Repository intelligence gate status: {gate}
Degraded evidence reviewed: {reviewed}
Degraded evidence brief: {brief}
Approval status: {status}
Approver: test-human
Approval timestamp or task reference: test
Approved paths:
- `apps/**`
'''
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'record.md'
            path.write_text(content)
            return module.validate_record(path)[0]

    def test_documented_degraded_is_allowed(self): self.assertEqual(self.record(), [])
    def test_ready_is_still_allowed(self): self.assertEqual(self.record(gate='READY'), [])
    def test_degraded_does_not_replace_human_approval(self): self.assertTrue(self.record(status='PENDING'))
    def test_requires_evidence_review(self): self.assertTrue(self.record(reviewed='NO'))
    def test_requires_existing_brief(self): self.assertTrue(self.record(brief='docs/missing.md'))
    def test_evidence_must_be_inside_repository(self): self.assertTrue(self.record(brief='/etc/passwd'))
    def test_blocked_and_missing_status_rejected(self): self.assertTrue(self.record(gate='BLOCKED')); self.assertTrue(self.record(gate=''))

if __name__ == '__main__': unittest.main()

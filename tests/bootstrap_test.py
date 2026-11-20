import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('bootstrap',Path(__file__).parents[1]/'scripts/bootstrap-github.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class BootstrapTests(unittest.TestCase):
    def test_plan_makes_no_remote_calls(self):
        with patch.object(module,'run',side_effect=AssertionError('Remote command in plan')),patch('builtins.print'):
            module.main(['--owner','example-org','--name','boardwalk-data-hub'])
    def test_invalid_identity_cannot_reach_cli(self):
        with patch.object(module,'run',side_effect=AssertionError('Invalid input reached shell')):
            with self.assertRaises(RuntimeError): module.main(['--owner','x;whoami','--name','pilot'])
    def test_rules_readback_must_match_all_required_properties(self):
        desired=module.settings('main.ruleset.json')
        self.assertTrue(module.subset(dict(desired,id=1),desired))
        modified=dict(desired,enforcement='disabled')
        self.assertFalse(module.subset(modified,desired))
        modified=dict(desired,bypass_actors=[{'actor_type':'RepositoryRole','actor_id':5,'bypass_mode':'always'}])
        self.assertFalse(module.subset(modified,desired))
    def test_admin_requirement_and_code_owners_not_inferred(self):
        self.assertFalse(module.subset({'permissions':{'push':True}},{'permissions':{'admin':True}}))
if __name__=='__main__': unittest.main()

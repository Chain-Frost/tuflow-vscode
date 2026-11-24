from pathlib import Path
import subprocess,os
r=Path('E:/Github/tuflow-issue9-20261124')
for mode in ['ntfs','unc','mapped']:
 for phase in ['baseline','integrated']:
  env=os.environ.copy();env['TUFLOW_LOCAL_TAG']='comparable-'+phase
  subprocess.run(['python',str(r/'run_local.py'),phase,mode,'full'],env=env,check=True)

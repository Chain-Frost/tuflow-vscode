from pathlib import Path
import subprocess,os
r=Path('E:/Github/tuflow-issue9-20261124')
for phase in ['baseline','integrated']:
 for mode in ['ntfs','unc','mapped']:
  env=os.environ.copy();env.update(TUFLOW_LOCAL_TAG='large-valid-'+phase,TUFLOW_LOCAL_RUNNER=str(r/'driver/models.cjs'),TUFLOW_MODEL_MODE=mode,TUFLOW_MODEL_METADATA='large-valid-metadata.json')
  subprocess.run(['python',str(r/'run_local.py'),phase,mode,'full'],env=env,check=True)

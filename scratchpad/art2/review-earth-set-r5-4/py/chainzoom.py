import sys; sys.path.insert(0, sys.argv[1])
sys.argv=[sys.argv[0],sys.argv[1],'light','1','0','/dev/null']+sys.argv[2:]
from lib import *
import importlib.util
spec=importlib.util.spec_from_file_location('chain',sys.argv[1]+'/chain.py')

import runpy, sys
sys.argv=['x', sys.argv[1], sys.argv[2]]
g = runpy.run_path(sys.argv[0] if False else '/home/user/Ninja-Fantasy-Game/tools/refs/phoenix-fire-from-ref.py', run_name='dbg')

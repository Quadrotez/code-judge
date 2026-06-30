(function(){"use strict";let t=null,e=!1;async function r(){if(!e)try{importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"),t=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"}),e=!0}catch(n){self.postMessage({type:"error",message:`Ошибка инициализации Pyodide: ${n.message}`})}}self.onmessage=async n=>{const{code:u,testInput:o,timeLimit:p}=n.data;if(e||await r(),!!e)try{const i=performance.now(),a=`
import sys
from io import StringIO

_input_data = """${(o===""?[]:o.split(`
`)).map(l=>l.replace(/"/g,'\\"')).join("\\n")}"""
_input_lines = _input_data.split('\\n') if _input_data else []
_input_index = 0

def mock_input(prompt=""):
    global _input_index
    if _input_index < len(_input_lines):
        line = _input_lines[_input_index]
        _input_index += 1
        return line
    raise EOFError("No more input")

import builtins
builtins.input = mock_input

_output_lines = []
def mock_print(*args, **kwargs):
    _output_lines.append(' '.join(str(arg) for arg in args))

builtins.print = mock_print

try:
    exec("""${u.replace(/"/g,'\\"').replace(/\n/g,"\\n")}""")
    _final_output = '\\n'.join(_output_lines) if _output_lines else ''
except Exception as e:
    _final_output = f"Error: {type(e).__name__}: {e}"
`;t.runPython(a);const d=t.runPython("_final_output"),s=performance.now()-i;s>p?self.postMessage({type:"timeout",timeLimit:p,actualTime:Math.round(s)}):self.postMessage({type:"success",output:String(d),executionTime:Math.round(s)})}catch(i){self.postMessage({type:"error",message:`${i.message}`})}}})();

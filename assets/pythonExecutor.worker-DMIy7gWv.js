(function(){"use strict";let e=null,n=!1,r=null;async function a(){if(!n)try{r=performance.now(),importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"),e=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"}),e.runPython(""),n=!0;const i=performance.now()-r;self.postMessage({type:"initialized",initTime:Math.round(i)})}catch(t){self.postMessage({type:"error",message:`Ошибка инициализации Pyodide: ${t.message}`})}}self.onmessage=async t=>{const{type:i,code:d,testInput:u,timeLimit:s}=t.data;if(i==="init"){await a();return}if(i==="execute"){if(!n){self.postMessage({type:"error",message:"Pyodide не инициализирован"});return}try{const o=performance.now(),l=`
import sys
from io import StringIO

_input_data = """${(u===""?[]:u.split(`
`)).map(_=>_.replace(/"/g,'\\"')).join("\\n")}"""
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
    exec("""${d.replace(/"/g,'\\"').replace(/\n/g,"\\n")}""")
    _final_output = '\\n'.join(_output_lines) if _output_lines else ''
except Exception as e:
    _final_output = f"Error: {type(e).__name__}: {e}"
`;e.runPython(l);const c=e.runPython("_final_output"),p=performance.now()-o;s>0&&p>s?self.postMessage({type:"timeout",timeLimit:s,actualTime:Math.round(p)}):self.postMessage({type:"success",output:String(c),executionTime:Math.round(p)})}catch(o){self.postMessage({type:"error",message:`${o.message}`})}}}})();

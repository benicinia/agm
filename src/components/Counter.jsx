import { useState } from 'preact/hooks'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div class="counter">
      <div class="counter-display">
        <span class="count">{count}</span>
      </div>
      <div class="counter-controls">
        <button 
          class="btn btn-danger" 
          onClick={() => setCount(count - 1)}
        >
          -1
        </button>
        <button 
          class="btn btn-secondary" 
          onClick={() => setCount(0)}
        >
          Reset
        </button>
        <button 
          class="btn btn-success" 
          onClick={() => setCount(count + 1)}
        >
          +1
        </button>
      </div>
      <div class="counter-batch">
        <button 
          class="btn btn-outline" 
          onClick={() => setCount(c => c + 5)}
        >
          +5
        </button>
        <button 
          class="btn btn-outline" 
          onClick={() => setCount(c => c - 5)}
        >
          -5
        </button>
      </div>
    </div>
  )
}
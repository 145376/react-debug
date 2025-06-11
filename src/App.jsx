import { useState } from "react-source/react"

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      I am React
      <button onClick={() => {
        setCount(count + 1)
      }}>{count}</button>
    </div>
  )
}

export default App

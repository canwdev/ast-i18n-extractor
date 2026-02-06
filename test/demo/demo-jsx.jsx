import React from 'react'

export function App() {
  const title = "Hello World"
  return (
    <div title="Container">
      <h1>{title}</h1>
      <p>This is a paragraph.</p>
      <button onClick={() => alert("Clicked")}>Click me</button>
      <img alt="Image" />
    </div>
  )
}

import React from 'react'

interface Props {
  name: string
}

export const Component: React.FC<Props> = ({ name }) => {
  return (
    <div>
      <span>Welcome, {name}</span>
      <p title="Tooltip">Text with "quotes"</p>
    </div>
  )
}

import { Suspense } from 'react';
import { use } from 'react';
const fetch = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })));
    }, 1000);
  })
}

const List = ({ promise }) => {
  const list = use(promise)
  return list.map(item => <div key={item.id}>{item.name}</div>)
}

const UseComp = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <List promise={fetch()}></List>
    </Suspense>
  );
}

export default UseComp
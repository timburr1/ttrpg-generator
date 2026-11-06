import './style.css';
import { dataFiles } from './data-files';
import { dataLoad, ErrorDataInvalid } from './data-load';
import { npcGenerate } from './npc';
import { tavernGenerate } from './tavern';
import { uiErrorShow, uiMount } from './ui';
import { uiPaneNpc } from './ui-npc';
import { uiPaneTavern } from './ui-tavern';

const root = document.getElementById('app');
if (root === null) {
  throw new Error('index.html has no #app element');
}

try {
  const data = dataLoad(dataFiles);
  uiMount(root, [
    { id: 'npc', label: 'NPC', element: uiPaneNpc((request) => npcGenerate(request, data.npc, Math.random)) },
    { id: 'tavern', label: 'Tavern', element: uiPaneTavern(() => tavernGenerate(data.tavern, Math.random)) },
  ]);
} catch (error) {
  console.error(error);
  if (error instanceof ErrorDataInvalid) {
    uiErrorShow(root, error.problems);
  } else {
    throw error;
  }
}

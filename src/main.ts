import './style.css';
import { dataFiles } from './data-files';
import { dataLoad, ErrorDataInvalid } from './data-load';
import { npcGenerate } from './npc';
import { uiErrorShow, uiMount } from './ui';

const root = document.getElementById('app');
if (root === null) {
  throw new Error('index.html has no #app element');
}

try {
  const data = dataLoad(dataFiles);
  uiMount(root, (request) => npcGenerate(request, data.npc, Math.random));
} catch (error) {
  console.error(error);
  if (error instanceof ErrorDataInvalid) {
    uiErrorShow(root, error.problems);
  } else {
    throw error;
  }
}

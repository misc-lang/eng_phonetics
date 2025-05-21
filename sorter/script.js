(function() {
  'use strict';

  const wordEntries = _sWords.splice(0);
  const wordElems = [];

  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];
  const clamp = (min, val, max = Infinity) => Math.max(min, Math.min(val, max));
  const toggleInvalid = (el, force) => el.classList.toggle('_invalid', force);
  const toggleSelect = (el, force) => el.classList.toggle('_selected', force);

  const root = $('main');
  const rootBody = root.lastElementChild;
  const vsValues = rootBody.dataset.vs.split('|');
  const bodyClasses = document.body.classList;

  const shells = wordEntries.map((x, i) => createShell(vsValues[i]));
  shells.push(createShell());
  const boxes = shells.map(shell => shell.lastElementChild);
  const lastBox = boxes.at(-1);
  rootBody.replaceChildren(...shells);

  let isLocked = 0;
  let dragMode = 0;
  let errCount = 0;
  let lastActiveWord = null;

  const resultEl = document.createElement('div');
  resultEl.className = 'sorter-result';

  const restartBtn = document.createElement('button');
  restartBtn.id = 's-restart';
  restartBtn.textContent = '↻';
  restartBtn.addEventListener('click', start);

  start();

  function start() {
    isLocked = 0;
    errCount = 0;
    lastActiveWord = null;
    wordElems.splice(0);

    const data = wordEntries.map(raw => raw.split(/\s+/));
    const rand = (arr) => Math.random() * arr.length >> 0;

    data.forEach((words, cat) => {
      for (let c = 0; c < 3; c++) {
        const word = words.splice(rand(words), 1)[0];
        wordElems.push(createWord(word, cat));
      }
    });

    while (wordElems.length < 12) {
      const cat = rand(data);
      const that = data[cat];
      const word = that.splice(rand(that), 1)[0];
      wordElems.push(createWord(word, cat));

      if (!that.length) data.splice(cat, 1);
    }

    wordElems.sort(() => Math.random() - 0.5);
    boxes.forEach(el => el.replaceChildren());
    lastBox.append(...wordElems);
  }

  function createWord(word, cat) {
    const elem = document.createElement('div');
    elem.className = 'word';
    elem.textContent = word;
    elem.dataset.cat = cat;
    return elem;
  }

  function createShell(vs) {
    const shell = document.createElement('div');
    shell.className = 'sorter-shell';

    if (vs) {
      const topElem = document.createElement('div');
      topElem.className = 'sorter-top';
      topElem.textContent = vs;
      shell.appendChild(topElem);
    }

    const boxElem = document.createElement('div');
    boxElem.className = 'sorter-box';
    shell.appendChild(boxElem);

    return shell;
  }

  function checkWord(elem) {
    if (lastBox.contains(elem)) return toggleInvalid(elem, 0);

    const {cat} = elem.dataset;
    const isInvalid = toggleInvalid(elem, !boxes[cat].contains(elem));

    if (isInvalid) errCount++;
  }

  function showResult() {
    let msg = 'Tickety-boo! Do me again.';

    if (errCount === 1) msg = 'That will do! Give yourself a pat.';
    else if (errCount >= 8) msg = 'That was... a dog’s dinner. Sorry.';
    else if (errCount >= 4) msg = 'No great shakes. Care to repeat?';
    else if (errCount >= 2) msg = 'That was okay...ish. Another round?';

    isLocked = 1;
    resultEl.replaceChildren(msg, restartBtn);
    lastBox.append(resultEl);
  }

  root.addEventListener('mousedown', function(e) {
    if (e.button || isLocked) return;
    if (!dragMode) dragMode = 1;

    const elem = e.target;
    if (!wordElems.includes(elem)) return;

    const coords = elem.getBoundingClientRect();
    const tx = coords.x | 0;
    const ty = coords.y | 0;
    const xd = e.x - tx >> 0;
    const yd = e.y - ty >> 0;
    const x = e.x - xd >> 0;
    const y = e.y - yd >> 0;
    const xMax = window.innerWidth - elem.offsetWidth;
    const yMax = window.innerHeight - elem.offsetHeight;

    const clone = elem.cloneNode(true);
    const {style} = clone;
    style.width = elem.offsetWidth + 'px';
    style.height = elem.offsetHeight + 'px';

    elem.classList.add('_disabled');
    clone.classList.add('_active');
    elem.append(clone);
    bodyClasses.add('is-drag-mode');

    onMove(e);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('keydown', cancel);

    function cancel(e) {
      if (e.key !== 'Escape' || e.repeat) return;

      this.removeEventListener('mouseup', onEnd);
      this.removeEventListener('mousemove', onMove);
      this.removeEventListener('keydown', cancel);

      clone.remove();
      elem.classList.remove('_disabled');
      bodyClasses.remove('is-drag-mode');
    }

    function onMove(e) {
      const x = clamp(0, e.x - xd, xMax) | 0;
      const y = clamp(0, e.y - yd, yMax) | 0;
      style.transform = `translate(${x}px, ${y}px)`;
    }

    function onEnd(e) {
      if (e.button) return;

      cancel.call(this, { key: 'Escape' });

      const box = e.target.closest('.sorter-box');

      if (!box || box.contains(elem)) return;

      box.append(elem);

      if (lastBox.childElementCount) return;

      wordElems.forEach(checkWord);
      showResult();
    }
  });

  root.addEventListener('click', function(e) {
    if (dragMode || isLocked) return;

    let elem = e.target;

    if (elem === lastActiveWord) {
      lastActiveWord = null;
      return toggleSelect(elem, 0);
    }

    if (lastActiveWord && wordElems.includes(elem)) {
      toggleSelect(lastActiveWord, 0);
      toggleSelect(elem, 1);
      lastActiveWord = elem;
      return;
    }

    if (lastActiveWord) {
      const item = lastActiveWord;
      const box = elem.closest('.sorter-box');

      if (!box || box.contains(item)) return;

      lastActiveWord = null;
      toggleSelect(item, 0);
      box.append(item);

      if (lastBox.childElementCount) return;

      wordElems.forEach(checkWord);
      showResult();
      return;
    }

    if (!wordElems.includes(elem)) return;

    lastActiveWord = elem;
    toggleSelect(elem, 1);
  });
})();
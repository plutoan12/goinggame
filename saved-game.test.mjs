import test from "node:test";
import assert from "node:assert/strict";
import { shortenEarlySave } from "./saved-game.js";
import { generateLevel, isWin } from "./engine.js";
import { createRun } from "./session.js";

function legacy(round, extra = false, revived = false) {
  const colors = round === 1 ? 6 : 8, capacity = round === 1 ? 8 : 10;
  const tubes = Array.from({length:colors}, (_, color) => Array(capacity).fill(color));
  [tubes[0][0], tubes[1][0]] = [tubes[1][0], tubes[0][0]];
  for (let i=0;i<2+Number(extra)+Number(revived);i++) tubes.push([]);
  return {mode:'blind',round,seed:42,moves:12,extra,attemptId:'old-attempt',history:[{old:true}],
    state:{capacity,tubes,hidden:tubes.map(t=>t.map(()=>false))},
    run:{...createRun(generateLevel('blind',42,1)),rule:'timed',revived,remainingMs:20000,clockStarted:true}};
}
test("old early boards become fresh short boards without mutating original save", () => {
  for (const round of [1,2]) for (const [extra,revived] of [[false,false],[true,true]]) {
    const old = legacy(round,extra,revived), before = structuredClone(old);
    const result = shortenEarlySave(old);
    assert.equal(result.shortened,true);
    assert.equal(result.wasComplete,false);
    assert.deepEqual(old,before);
    assert.equal(result.saved.round,round);
    assert.equal(result.saved.seed,42);
    assert.equal(result.saved.state.tubes.flat().length,round === 1 ? 16 : 30);
    assert.equal(result.saved.moves,0);
    assert.equal(result.saved.extra,false);
    assert.deepEqual(result.saved.history,[]);
    assert.equal(result.saved.attemptId,undefined);
    assert.equal(result.saved.run.rule,'timed');
    assert.equal(result.saved.run.clockStarted,false);
    assert.equal(result.saved.run.revived,false);
  }
});
test("current and later boards are preserved, malformed legacy boards are not repaired silently", () => {
  for (const round of [1,2,3,4,5]) {
    const saved={...legacy(1),round,state:generateLevel('blind',42,round).state};
    assert.equal(shortenEarlySave(saved).saved,saved);
    assert.equal(shortenEarlySave(saved).shortened,false);
  }
  const bad=legacy(1); bad.state.tubes[0].pop();
  assert.equal(shortenEarlySave(bad).shortened,false);
});
test("already completed legacy board exposes completion for existing progression", () => {
  const saved=legacy(1);
  [saved.state.tubes[0][0],saved.state.tubes[1][0]]=[saved.state.tubes[1][0],saved.state.tubes[0][0]];
  assert.equal(isWin(saved.state),true);
  assert.equal(shortenEarlySave(saved).wasComplete,true);
});

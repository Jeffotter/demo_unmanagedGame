import { ClassicListenersCollector } from "@empirica/core/admin/classic";
import { getCurrentBatch } from "./utils";

export const Empirica = new ClassicListenersCollector();

// ---------- Batch Callbacks ------------ //Batch callbacks are run when the admin clicks Gamestart

// onBatchStart


Empirica.on("batch", "status", (ctx, { batch, status }) => {
  if (status !== "running") return;
  if (batch.get("initialized")) return; // Ensure the game does not initilize during every refresh
  console.log("BATCH RAN")

  const { config } = batch.get("config");
  console.log("config", config);
  config?.treatments?.forEach((entry) => {
    console.log("treatment", entry.treatment);
    // console.log("count", entry.count);
    for (let i = 0; i < entry.count; i++) {
      // console.log(entry.treatment)
      const kvArray = Object.entries(entry.treatment).map(([k, v], i) => {
        //Manually selecting the treatment to add to the game
        const checkKey = k === "factors" 
        return { key: k, value: v };
      });
      kvArray.push({ key: "player_count", value: 0 });
      kvArray.push({ key: "treatment", value: entry.treatment.factors });
      kvArray.push({ key: "players_doneIntro", value: 0 });
      console.log("kvArray", kvArray);
      batch.addGame(kvArray); //Initilize game with treatment parameters
      console.log("Creating game with treatment", entry.treatment);
    }
  });


  batch.set("initialized",true);
});

// ----------- Game Callbacks ------------

Empirica.onGameStart(({ game }) => {
  const round = game.addRound({
    name: "Round 1 - Jelly Beans",
    task: "jellybeans",
  });
  round.addStage({ name: "Answer", duration: 300 });
  round.addStage({ name: "Result", duration: 120 });

  const round2 = game.addRound({
    name: "Round 2 - Minesweeper",
    task: "minesweeper",
  });
  round2.addStage({ name: "Play", duration: 300 });
});

Empirica.onRoundStart(({ round }) => {});

Empirica.onStageStart(({ stage }) => {});

Empirica.onStageEnded(({ stage }) => {
  calculateJellyBeansScore(stage);
});

Empirica.onRoundEnded(({ round }) => {});

Empirica.onGameEnded(({ game }) => {});

// Note: this is not the actual number of beans in the pile, it's a guess...
const jellyBeansCount = 634;

function calculateJellyBeansScore(stage) {
  if (
    stage.get("name") !== "Answer" ||
    stage.round.get("task") !== "jellybeans"
  ) {
    return;
  }

  for (const player of stage.currentGame.players) {
    let roundScore = 0;

    const playerGuess = player.round.get("guess");

    if (playerGuess) {
      const deviation = Math.abs(playerGuess - jellyBeansCount);
      const score = Math.round((1 - deviation / jellyBeansCount) * 10);
      roundScore = Math.max(0, score);
    }

    player.round.set("score", roundScore);

    const totalScore = player.get("score") || 0;
    player.set("score", totalScore + roundScore);
  }
}



export function getOpenBatches(ctx) {
  // Return an array of open batches

  const batches = ctx.scopesByKind("batch"); // returns Map object
  // players can join an open batch
  const openBatches = [];

  for (const [, batch] of batches) {
    if (batch.get("status") === "running") openBatches.push(batch);
  }
  return openBatches;
}

export function selectOldestBatch(batches) {
  if (!Array.isArray(batches)) return undefined;
  if (!batches.length > 0) return undefined;

  let currentOldestBatch = batches[0];
  for (const comparisonBatch of batches) {
    try {
      if (
        Date.parse(currentOldestBatch.get("createdAt")) >
        Date.parse(comparisonBatch.get("createdAt"))
      )
        currentOldestBatch = comparisonBatch;
    } catch (err) {
      console.log(
        `Failed to parse createdAt timestamp for Batch ${comparisonBatch.id}`
      );
      console.log(err);
    }
  }
  return currentOldestBatch;
}



// ------------ player callbacks ------------ //Player callbacks are run when the Player submits their id
Empirica.on("player", (ctx, { player }) => {
  if (player.get("intialized")) return; // this is to make sure that the callback doesn't run twice, which it does for some reason
  player.set("intialized", true);

 // console.log("groupCode", groupCode);

  // get the batch that the player is joining
  const openBatches = getOpenBatches(ctx);
  const batch = selectOldestBatch(openBatches);
  console.log('How many batches?',openBatches.length)
  if (!batch) {
    console.log("Batch not found");
    return;
  }
  // get all the games currently attached to the batch
  const games = batch.games;

  console.log("Games length",games.length)

  console.log('player_id',player.id)

  
  const slots = batch.games.map((game) => {
    if(game.get('assigned_placement') === undefined){
    game.set("assigned_placement",true);
    }
   return game
  });
  console.log('games',games[0].get('name'))

  // Pseudo-randomly assign the player to a game
  slots[0].assignPlayer(player);
  slots[0].set('player_count', slots[0].get('player_count') + 1);
  slots.forEach((game) => {
  console.log('game',game.get('player_count'))
  }
  )
  


});
/*
Empirica.on("game", (ctx, { game }) => {
  if (game.get("initialize")) return;
  console.log('GAME RAN')
  game.set("initialize", true);
  console.log("got here");
  const players = ctx.scopesByKind("player");
  //const startingPlayerId = game.get("startingPlayerId");
  //const startingPlayer = players.get(startingPlayerId);

  //game.assignPlayer(startingPlayer);
  game.start();
});*/

// This is where I may custom start a game when enough players have joined

Empirica.on("player", "introDone", (ctx, { player, introDone }) => {
  if (!introDone) return;
  if(player.get('FinishedIntro')) return;

  console.log("player.currentGame players", player.currentGame?.get('treatment'));
  console.log("player.currentGame Done Intro", player.currentGame?.get('players_doneIntro'));
  
  player.currentGame.set('players_doneIntro', player.currentGame.get('players_doneIntro') + 1);
  player.set('FinishedIntro', true);
  
  console.log("player.currentGame Done Intro", player.currentGame?.get('players_doneIntro'));

  if(player.currentGame.get('players_doneIntro') >= player.currentGame.get('treatment').min){
    console.log('do we get here?')
    player.currentGame.start();
    }
  
  
});

const flowData = {
  manager: {
    kicker: "Persistent runtime",
    name: "Manager Scene",
    summary: "GameBootstrap이 저장 데이터를 로드하고 GameServices에 런타임 서비스를 등록합니다.",
    files: "GameBootstrap.cs, GameSaveService.cs, SceneFlowController.cs",
    responsibility: "씬 전환 중에도 NPC, 퀘스트, 규칙, 인벤토리, 플로우 상태를 유지합니다."
  },
  field: {
    kicker: "JSON-driven field",
    name: "Field Explore",
    summary: "FieldManager가 MapData JSON과 AssetRegistry를 읽어 장소, NPC, 이동 화살표를 구성합니다.",
    files: "FieldManager.cs, FieldInputController.cs, InteractableSpawner.cs",
    responsibility: "플레이어가 장소를 이동하고 NPC를 발견하는 필드 탐색 경험을 담당합니다."
  },
  dialogue: {
    kicker: "Narrative state machine",
    name: "Dialogue Flow",
    summary: "FlowOrchestrator가 Conversation, FreeInput, Gameplay, MovingScene 스텝을 순서대로 실행합니다.",
    files: "FlowOrchestrator.cs, PhaseRegistry.cs, FlowStepData.cs",
    responsibility: "Pixel Crushers 대화, 자유입력, 전환 연출, 맵 이동을 하나의 전반부 흐름으로 묶습니다."
  },
  freechat: {
    kicker: "LLM interaction",
    name: "AI Free Chat",
    summary: "FreeChatSceneController가 플레이어 입력을 백엔드에 보내고 NPC 응답, 신뢰도, 감정을 갱신합니다.",
    files: "FreeChatSceneController.cs, BackendApiClient.cs, NpcSessionStateManager.cs",
    responsibility: "자유로운 설득 대화를 플레이 가능한 퀘스트 단계로 만들고 결과를 상위 플로우에 통지합니다."
  },
  puzzle: {
    kicker: "Physics learning loop",
    name: "Physics Puzzle",
    summary: "PuzzleSceneRelay가 퍼즐 씬으로 이동하고 PuzzleCompletionHandler가 완료 후 원래 필드 위치로 복귀시킵니다.",
    files: "PuzzleSceneRelay.cs, PuzzleCompletionHandler.cs, GameControllerDebug.cs",
    responsibility: "오크 속도, 자유낙하 등 물리 실험을 퀘스트 완료 조건과 연결합니다."
  }
};

const locations = {
  inside: {
    image: "assets/images/inside-home.png",
    id: "inside_home",
    title: "집 안",
    copy: "전반부의 시작 지점입니다. 메리와의 첫 접점이 만들어지고 필드 탐색으로 이어집니다.",
    npcs: ["메리"]
  },
  town: {
    image: "assets/images/town.png",
    id: "town",
    title: "광장",
    copy: "마을 탐색의 허브입니다. 여러 길이 연결되고 NPC 도감과 퀘스트 상태가 필드 경험으로 드러납니다.",
    npcs: ["데미안", "에일로"]
  },
  cliff: {
    image: "assets/images/rock-cliff.png",
    id: "rock_cliff",
    title: "절벽",
    copy: "자유낙하와 절벽 높이 학습으로 이어지는 장소입니다. 전반부 후반 대화와 물리 퍼즐의 접점입니다.",
    npcs: ["메리"]
  },
  battle: {
    image: "assets/images/battlefield.png",
    id: "battlefield",
    title: "전선",
    copy: "전투와 오크 속도 퍼즐이 연결되는 긴장 구간입니다. 물리 개념이 게임 목표로 변환됩니다.",
    npcs: ["차라쿠라", "아루스", "라구스"]
  }
};

const npcs = {
  merry: {
    portrait: "assets/images/merry.png",
    role: "Final gatekeeper",
    name: "메리",
    copy: "전반부의 핵심 자유대화 NPC입니다. 플레이어 발화에 따라 신뢰도와 감정이 바뀌고, 성공 여부가 다음 대화 흐름에 반영됩니다.",
    trust: 66,
    label: "Trust 50 to 60+",
    sample: "\"네가 뭘 알고 있는지, 한 번 말해 봐.\""
  },
  mugor: {
    portrait: "assets/images/mugor.png",
    role: "Persuasion target",
    name: "무고르",
    copy: "초기 신뢰도가 낮은 설득 대상입니다. 플레이어가 이전 대화에서 얻은 정보를 어떻게 활용하는지 시험합니다.",
    trust: 42,
    label: "Trust 20 to variable",
    sample: "\"말은 많군. 증거가 있나?\""
  },
  varos: {
    portrait: "assets/images/varos.png",
    role: "Field witness",
    name: "바로스",
    copy: "필드 탐색과 NPC 도감의 존재감을 보여주는 인물입니다. 발견 상태와 정보 해금 구조의 기준점이 됩니다.",
    trust: 52,
    label: "Discovery state tracked",
    sample: "\"감옥 쪽에서 본 일을 그냥 넘길 수는 없지.\""
  }
};

const endpoints = {
  freeTurn: `POST /freeTurn
{
  "npcId": "Mary_S1",
  "userInput": "저는 당신을 설득하러 왔어요.",
  "currentTrust": 50,
  "currentEmotionLabel": "wary"
}

returns replyText, trustScore, baseEmotionLabel, dialogueAction`,
  runtimeGeneratedDialogue: `POST /runtimeGeneratedDialogue
{
  "targetNpcId": "Mary_S2",
  "momentId": "after_free_input",
  "transcripts": [
    { "stepId": "free_input_mary", "turns": [] }
  ]
}

returns variables for Pixel Crushers Dialogue System`,
  logUiEvent: `POST /logUiEvent
{
  "sessionId": "demo-session",
  "sceneId": "Village_Test_scene_Dial",
  "npcId": "Mary_S1",
  "eventName": "message_submitted"
}

stores telemetry in Firestore for debugging and design review`
};

function setActive(buttons, activeButton) {
  buttons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle("is-active", isActive);
    if (button.getAttribute("role") === "tab") {
      button.setAttribute("aria-selected", String(isActive));
    }
  });
}

document.querySelectorAll(".flow-step").forEach((button) => {
  button.addEventListener("click", () => {
    const data = flowData[button.dataset.flow];
    if (!data) return;
    setActive(document.querySelectorAll(".flow-step"), button);
    document.getElementById("flow-kicker").textContent = data.kicker;
    document.getElementById("flow-name").textContent = data.name;
    document.getElementById("flow-summary").textContent = data.summary;
    document.getElementById("flow-files").textContent = data.files;
    document.getElementById("flow-responsibility").textContent = data.responsibility;
  });
});

document.querySelectorAll(".map-node").forEach((button) => {
  button.addEventListener("click", () => {
    const data = locations[button.dataset.location];
    if (!data) return;
    setActive(document.querySelectorAll(".map-node"), button);
    const image = document.getElementById("location-image");
    image.src = data.image;
    image.alt = `${data.title} 장소 이미지`;
    document.getElementById("location-id").textContent = data.id;
    document.getElementById("location-title").textContent = data.title;
    document.getElementById("location-copy").textContent = data.copy;
    document.getElementById("location-npcs").innerHTML = data.npcs.map((npc) => `<span>${npc}</span>`).join("");
  });
});

document.querySelectorAll(".npc-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const data = npcs[button.dataset.npc];
    if (!data) return;
    setActive(document.querySelectorAll(".npc-tab"), button);
    const portrait = document.getElementById("npc-portrait");
    portrait.src = data.portrait;
    portrait.alt = `${data.name} 초상`;
    document.getElementById("npc-role").textContent = data.role;
    document.getElementById("npc-name").textContent = data.name;
    document.getElementById("npc-copy").textContent = data.copy;
    document.getElementById("trust-label").textContent = data.label;
    document.getElementById("trust-fill").style.width = `${data.trust}%`;
    document.getElementById("npc-sample").textContent = data.sample;
  });
});

document.querySelectorAll(".endpoint").forEach((button) => {
  button.addEventListener("click", () => {
    const code = endpoints[button.dataset.endpoint];
    if (!code) return;
    setActive(document.querySelectorAll(".endpoint"), button);
    document.getElementById("endpoint-code").textContent = code;
  });
});

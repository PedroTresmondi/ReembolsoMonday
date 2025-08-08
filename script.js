const monday = mondaySdk();
monday.setToken(MONDAY_API_TOKEN);

// ---------------- Helpers ----------------
function setStatus(msg, ok = true) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = ok ? "mt-4 text-sm text-green-700" : "mt-4 text-sm text-red-700";
}

function escapeForGraphQL(jsonObj) {
  return JSON.stringify(jsonObj).replace(/"/g, '\\"');
}

// ---------------- Carregamento de dados ----------------
async function loadUsers() {
  const res = await monday.api(`
    query {
      users(kind: non_guests, limit: 500) {
        id
        name
        enabled
      }
    }
  `);
  return res.data.users.filter(u => u.enabled);
}

async function loadBoardItems(boardId) {
  const res = await monday.api(`
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: 500) {
          items { id name }
        }
      }
    }
  `);
  return res.data.boards[0].items_page.items;
}

async function populatePessoaSelect() {
  const users = await loadUsers();
  const sel = document.getElementById("pessoa");
  sel.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    sel.appendChild(opt);
  });
}

// 🔍 Descobre boards conectados à coluna COL_EVENTO
async function getConnectedBoardIds(boardId, columnId) {
  const res = await monday.api(`
    query {
      boards(ids: [${boardId}]) {
        columns(ids: ["${columnId}"]) {
          id
          settings_str
        }
      }
    }
  `);
  const settings = JSON.parse(res.data.boards[0].columns[0].settings_str || "{}");
  const ids = settings.boardIds || settings.boardIdsStr || [];
  return ids.map(Number).filter(Boolean);
}

// 🔄 Popula o select de Evento com itens de boards conectados
async function populateEventoSelectFromConnectedBoards() {
  const sel = document.getElementById("evento");
  sel.innerHTML = "";

  const connectedBoardIds = await getConnectedBoardIds(BOARD_ID_REEMBOLSOS, COL_EVENTO);

  if (!connectedBoardIds.length) {
    setStatus("A coluna de Evento não está conectada a nenhum board.", false);
    return;
  }

  const queries = connectedBoardIds.map(id => monday.api(`
    query {
      boards(ids: [${id}]) {
        id
        name
        items_page(limit: 500) {
          items { id name }
        }
      }
    }
  `));

  const results = await Promise.all(queries);

  results.forEach(r => {
    const b = r.data.boards[0];
    const groupLabel = document.createElement("optgroup");
    groupLabel.label = `• ${b.name}`;
    sel.appendChild(groupLabel);

    b.items_page.items.forEach(it => {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = it.name;
      groupLabel.appendChild(opt);
    });
  });
}

// ---------------- Criação do item ----------------
async function createReembolso(payload) {
  const columnValues = {
    [COL_PESSOA]: { personsAndTeams: [{ id: Number(payload.pessoaId), kind: "person" }] },
    [COL_DATA_GASTO]: { date: payload.dataGasto },
    [COL_VALOR]: payload.valor ? String(payload.valor) : "",
    [COL_EVENTO]: { linkedPulseIds: [{ linkedPulseId: Number(payload.eventoItemId) }] },
    ...(payload.link ? { [COL_LINK]: { url: payload.link, text: "Comprovante/Referência" } } : {})
  };

  const mutation = `
    mutation {
      create_item(
        board_id: ${BOARD_ID_REEMBOLSOS},
        item_name: "${payload.descricao.replace(/"/g, '\\"')}",
        column_values: "${escapeForGraphQL(columnValues)}"
      ) { id }
    }
  `;
  return monday.api(mutation);
}

// ---------------- Upload de comprovante ----------------
async function uploadFileToColumn(itemId, file) {
  const formData = new FormData();
  formData.append("query", `
    mutation addFile($file: File!) {
      add_file_to_column(
        item_id: ${itemId},
        column_id: "${COL_COMPROVANTE}",
        file: $file
      ) { id }
    }
  `);
  formData.append("variables[file]", file);

  const res = await fetch("https://api.monday.com/v2/file", {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN
    },
    body: formData
  });

  return res.json();
}

// ---------------- Inicialização ----------------
async function init() {
  try {
    await Promise.all([populatePessoaSelect(), populateEventoSelectFromConnectedBoards()]);
  } catch (e) {
    console.error(e);
    setStatus("Falha ao carregar listas. Verifique permissões/IDs.", false);
  }
}

// ---------------- Eventos ----------------
document.addEventListener("DOMContentLoaded", () => {
  init();

  document.getElementById("form-reembolso").addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Enviando...");

    const descricao = document.getElementById("descricao").value.trim();
    const pessoaId = document.getElementById("pessoa").value;
    const dataGasto = document.getElementById("data_gasto").value;
    const valor = document.getElementById("valor").value;
    const eventoItemId = document.getElementById("evento").value;
    const link = document.getElementById("link").value.trim();
    const file = document.getElementById("comprovante").files[0];

    if (!descricao || !pessoaId || !dataGasto || !eventoItemId) {
      setStatus("Preencha os campos obrigatórios.", false);
      return;
    }

    try {
      const res = await createReembolso({
        descricao, pessoaId, dataGasto, valor, eventoItemId, link
      });

      console.log("Resposta da criação:", res);

      if (res.errors && res.errors.length > 0) {
        console.error("Erro detalhado:", res.errors[0].message);
        setStatus("Erro: " + res.errors[0].message, false);
        return;
      }

      if (!res.data || !res.data.create_item) {
        setStatus("Erro: não foi possível criar o reembolso.", false);
        return;
      }

      const itemId = res.data.create_item.id;

      if (file) {
        await uploadFileToColumn(itemId, file);
      }

      setStatus(`Reembolso criado com sucesso! ID: ${itemId}`);
      e.target.reset();
    } catch (err) {
      console.error(err);
      setStatus("Erro ao criar reembolso. Veja o console para detalhes.", false);
    }
  });
});

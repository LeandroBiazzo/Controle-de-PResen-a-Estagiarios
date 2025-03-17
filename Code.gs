// Código para o Google Apps Script (Code.gs)

// Configurações globais
const SHEET_ID = '1-k-gEljVfCdwXgtexSrX6eeSe-y3Z3hrFQrW0h8cl7U'; // ID da sua planilha
const ALUNOS_SHEET_NAME = 'Alunos';
const REGISTROS_SHEET_NAME = 'Registros';

// Função para tratar solicitações GET
function doGet(e) {
  // Obter parâmetros da URL
  const action = e.parameter.action;
  
  try {
    let result;
    
    // Executar ação com base no parâmetro 'action'
    if (action === 'getAluno') {
      // Buscar aluno pelo nome e senha
      const nome = e.parameter.nome;
      const senha = e.parameter.senha;
      result = buscarAluno(nome, senha);
    } 
    else if (action === 'getAllAlunos') {
      // Listar todos os alunos (para depuração)
      result = listarAlunos();
    }
    else {
      result = { error: "Ação não reconhecida" };
    }
    
    // Retornar resultado como JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Tratar erros e retornar mensagem de erro
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para tratar solicitações POST
function doPost(e) {
  try {
    // Obter e analisar os dados enviados
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    let result;
    
    // Executar ação com base no parâmetro 'action'
    if (action === 'cadastrarAluno') {
      result = cadastrarAluno(postData.aluno);
    } 
    else if (action === 'registrarPresenca') {
      result = registrarPresenca(postData.registro);
    }
    else {
      result = { error: "Ação não reconhecida" };
    }
    
    // Retornar resultado como JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Tratar erros e retornar mensagem de erro
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para cadastrar um novo aluno
function cadastrarAluno(aluno) {
  // Validar dados do aluno
  if (!aluno.nome || !aluno.periodo || !aluno.senha || aluno.senha.length !== 4) {
    return { success: false, error: "Dados incompletos ou inválidos" };
  }
  
  // Verificar se aluno já existe
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ALUNOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  
  // Encontrar índices de colunas
  const nomeIndex = header.indexOf('Nome');
  const senhaIndex = header.indexOf('Senha');
  
  if (nomeIndex === -1 || senhaIndex === -1) {
    return { success: false, error: "Estrutura da planilha inválida" };
  }
  
  // Extrair primeiro nome para comparação
  const firstName = aluno.nome.split(' ')[0].toLowerCase();
  
  // Verificar se já existe aluno com mesmo primeiro nome e senha
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowFirstName = row[nomeIndex].toString().split(' ')[0].toLowerCase();
    
    if (rowFirstName === firstName && row[senhaIndex].toString() === aluno.senha) {
      return { success: false, error: "Já existe um aluno com este nome e senha" };
    }
  }
  
  // Gerar novo ID
  const newId = data.length; // IDs começam do 1, mas temos o cabeçalho
  
  // Preparar nova linha
  const newRow = [
    newId, 
    aluno.nome, 
    aluno.periodo, 
    aluno.senha, 
    new Date(), 
    aluno.curso || ""
  ];
  
  // Adicionar à planilha
  sheet.appendRow(newRow);
  
  return { 
    success: true, 
    id: newId,
    message: "Aluno cadastrado com sucesso"
  };
}

// Função para buscar aluno pelo nome e senha
function buscarAluno(nome, senha) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ALUNOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  
  // Encontrar índices de colunas
  const idIndex = header.indexOf('ID');
  const nomeIndex = header.indexOf('Nome');
  const periodoIndex = header.indexOf('Periodo');
  const senhaIndex = header.indexOf('Senha');
  const cursoIndex = header.indexOf('Curso');
  
  if (idIndex === -1 || nomeIndex === -1 || periodoIndex === -1 || senhaIndex === -1) {
    return { success: false, error: "Estrutura da planilha inválida" };
  }
  
  // Buscar aluno pelo primeiro nome e senha
  const firstName = nome.toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowFirstName = row[nomeIndex].toString().split(' ')[0].toLowerCase();
    
    if (rowFirstName === firstName && row[senhaIndex].toString() === senha) {
      return { 
        success: true,
        id: row[idIndex],
        nome: row[nomeIndex],
        periodo: row[periodoIndex],
        senha: row[senhaIndex],
        curso: cursoIndex !== -1 ? row[cursoIndex] : ""
      };
    }
  }
  
  return { success: false, error: "Credenciais inválidas ou aluno não encontrado" };
}

// Função para listar todos os alunos
function listarAlunos() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ALUNOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  
  const alunos = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const aluno = {};
    
    for (let j = 0; j < header.length; j++) {
      aluno[header[j]] = row[j];
    }
    
    alunos.push(aluno);
  }
  
  return { success: true, alunos: alunos };
}

// Função para registrar presença e atividades
function registrarPresenca(registro) {
  // Validar dados do registro
  if (!registro.alunoID || !registro.nome || !registro.data || 
      !registro.tipoEstagio || !registro.horaEntrada || !registro.horaSaida) {
    return { success: false, error: "Dados incompletos" };
  }
  
  // Obter planilha de registros
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REGISTROS_SHEET_NAME);
  
  // Gerar novo ID
  const newId = sheet.getLastRow(); // IDs começam do 1, mas temos o cabeçalho
  
  // Preparar nova linha
  const newRow = [
    newId, 
    registro.alunoID, 
    registro.nome, 
    registro.data, 
    registro.tipoEstagio, 
    registro.horaEntrada,
    registro.horaSaida,
    registro.atividades || "",
    registro.curso || ""
  ];
  
  // Adicionar à planilha
  sheet.appendRow(newRow);
  
  return { 
    success: true, 
    id: newId,
    message: "Registro salvo com sucesso"
  };
}

// Função auxiliar para inicializar a planilha (criar cabeçalhos)
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Inicializar aba Alunos
  let alunosSheet = ss.getSheetByName(ALUNOS_SHEET_NAME);
  if (!alunosSheet) {
    alunosSheet = ss.insertSheet(ALUNOS_SHEET_NAME);
    alunosSheet.appendRow(['ID', 'Nome', 'Periodo', 'Senha', 'DataCadastro', 'Curso']);
  }
  
  // Inicializar aba Registros
  let registrosSheet = ss.getSheetByName(REGISTROS_SHEET_NAME);
  if (!registrosSheet) {
    registrosSheet = ss.insertSheet(REGISTROS_SHEET_NAME);
    registrosSheet.appendRow(['ID', 'AlunoID', 'Nome', 'Data', 'TipoEstagio', 'HoraEntrada', 'HoraSaida', 'AtividadesRealizadas', 'Curso']);
  }
  
  return "Planilhas inicializadas com sucesso!";
}

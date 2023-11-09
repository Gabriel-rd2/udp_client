// ===============================================
// Código de cliente UDP para envio de mídia para servidor.
// Disciplina: Redes de Computadores II - Prof. Elias P. Duarte Jr.
// Aluna: Gabriel de Almeida Sales Evaristo - GRR20165266
// ===============================================

// Importação de bibliotecas
const cv = require("opencv4nodejs"); // manipulação de imagens
const ip = require("ip"); // manipulação de endereços IP
const dgram = require("node:dgram"); // comunicação via UDP
const { Buffer } = require("node:buffer"); // manipulação de buffers de dados

// Definição da configuração do servidor UDP
const server = {
  address: "146.190.155.2",
  // address: "127.0.0.1",
  port: 41234,
};

// Definição variáveis de controle
let delay = 0;
let source = "webcam";
let duration = undefined;
let timeRemaining = 0;
const ESC = 27;

// Tratamento de argumentos
if (process.argv.length > 2) {
  try {
    const args = process.argv.slice(2);
    let fps = undefined;

    var i = 0;
    while (i < args.length) {
      let name = args[i];

      switch (name) {
        case "--fps":
          fps = parseInt(args[i + 1]);
          delay = Math.ceil(1000 / fps); // Delay em millisegundos para atingir a taxa de quadros
          i = i + 2;
          break;

        case "--duration":
          duration = parseInt(args[i + 1]) * 1000;
          timeRemaining = duration;
          i = i + 2;
          break;

        case "--source":
          source = args[i + 1];
          i = i + 2;
          break;

        case "--help":
          console.log(
            " Uso: node udp_client.js --fps int --duration int --source str"
          );
          process.exit(0);

        default:
          console.log(
            "Argumentos inválidos!\n Uso: node udp_client.js --fps int --duration int --source str"
          );
          process.exit(0);
      }
    }
  } catch (e) {
    console.log(e);
    console.log(
      "Argumentos inválidos!\n Uso: node udp_client.js --fps FPS --duration DUR --source SOURCE"
    );
    process.exit(0);
  }
}

// Definição de variáveis para cálculo das estatísticas de uso
let waitingResponse = [];
let outOfOrderResponses = 0;
let lastResponseOrder = 0;

// Função que define o cliente UDP
const start_client = async () => {
  // Define uma variavel que guarda a tecla clicada durante a visualização do frame recebido,
  // a tecla ESC finaliza o teste
  let key = undefined;

  // Define variável usada para indicar a ordem dos pacotes enviados
  let order = 1;

  console.log("Instanciando o Socket ...");
  const client = dgram.createSocket("udp4");

  console.log('Registrando callback para o evento "listening" ...');
  client.on("listening", () => {
    const address = client.address();
    console.log(
      "%s%s",
      `Socket iniciado! ${address.family} ${ip.address()}:${address.port}\n`,
      "-----------------------------------------------------------------------------\n"
    );
  });

  console.log('Registrando callback para o evento "message" ...');
  client.on("message", (msg, info) => {
    // Converte a mensagem recebida em um objeto JSON
    const message = JSON.parse(msg.toString());

    console.log(
      `A mensagem ${message.order}, com ${msg.length} bytes, foi recebida!`
    );

    // Remove pacote recebido dos pacotes que estão esperando resposta,
    // ao final da execução, o tamanho do vetor waitingReponse indica
    // quantos pacotes foram perdidos
    waitingResponse = waitingResponse.filter((el) => el !== message.order);

    //Lógica para detectar pacotes fora de ordem.
    // Se o pacotes estão em ordem, o valor de message.order
    // é sempre maior que o valor de lastResponseOrder
    if (message.order < lastResponseOrder) {
      // Se o valor for menor, temos um pacote fora de ordem
      outOfOrderResponses++;
    }
    // Atualiza-se a variável lastResponseOrder com a ordem do pacote atual
    lastResponseOrder = message.order;

    // Converte e mostra a imagem que vem na mensagem
    // isso só acontece se o loop de envio não tiver terminado ainda
    if (duration !== undefined ? timeRemaining > 0 : key !== ESC) {
      let buf = Buffer.from(message.image, "base64");
      let image = cv.imdecode(buf);
      cv.imshow("UDP Server Response", image);
      key = cv.waitKey(1);
    }
  });

  console.log('Registrando callback para o evento "close" ...');
  client.on("close", () => {
    console.log("Socket fechado!\n");
    console.log(
      "%s%s%s%s%s",
      "=============================================================================\n",
      "Fim da execucao: udp_client.js\n",
      `Pacotes perdidos: ${waitingResponse.length}\n`,
      `Pacotes fora de ordem: ${outOfOrderResponses}\n`,
      "=============================================================================\n"
    );
    process.exit(0);
  });

  // Definição da fonte de vídeo
  let capture = undefined;
  if (source === "webcam") {
    // Definição do objeto que representa a webcam
    const devicePort = 0;
    capture = new cv.VideoCapture(devicePort);

    // Definição do tamanho das imagens a serem capturadas
    capture.set(cv.CAP_PROP_FRAME_WIDTH, 300);
    capture.set(cv.CAP_PROP_FRAME_HEIGHT, 168);
  } else {
    capture = new cv.VideoCapture(source);
  }

  // Loop para envio da stream de vídeo
  let run = duration !== undefined ? timeRemaining > 0 : key !== ESC;
  while (run) {
    // Leitura de um frame do vídeo
    let frame = capture.read();
    // Se não for a webcam, é preciso resetar o objeto capture
    // caso o video tenha chegado ao fim
    if (source !== "webcam" && frame.empty) {
      capture.reset();
      frame = capture.read();
    }

    // Criação dos dados a serem enviados, a mensagem é um JSON
    // que contém a ordem do pacote e o frame capturado, convertido em string
    const data = JSON.stringify({
      order,
      image: cv.imencode(".jpg", frame).toString("base64"),
    });

    // Envio da mensagem para o servidor UDP
    client.send(
      data,
      server.port,
      server.address,
      // Definição da função que é executada após o envio da mensagem
      (error, bytes) => {
        if (error) {
          console.log("Falha ao enviar a mensagem %d!", order);
          console.log("Erro:", error);
          console.log(
            "-----------------------------------------------------------------------------"
          );
          console.log("Fechando o socket...");

          // No caso de um erro isso é indicado no log e o socket é fechado
          client.close();
        } else {
          console.log(`A mensagem ${order}, de ${bytes} bytes, foi enviada!`);

          // Caso a mensagem tenha sido enviada com sucesso,
          // o valor de sua ordem é inserido no vetor waitingResponse
          // e a variavel de controle "order" é incrementada
          waitingResponse.push(order);
          order++;
        }
      }
    );

    // Mecanismo que implementa delay entre as mensagens
    // isso permite chegar numa taxa de quadros proxima do valor de "fps"
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Define a condição do while com base em existir uma duração para o teste ou não
    if (duration !== undefined) {
      timeRemaining = timeRemaining - delay;
      run = timeRemaining > 0;
    } else {
      run = key !== ESC;
    }
  }

  // Fecha a janela de visualização depois que o loop acaba
  cv.destroyAllWindows();

  // Lógica para finalização do programa
  if (duration !== undefined ? timeRemaining <= 0 : key === ESC) {
    // Impressão de aviso de que o teste acabou, com base se existe duração ou não
    console.log(
      "\n%s\n%s",
      duration !== undefined
        ? `\nAproximadamente ${
            duration / 1000
          }s se passaram, o teste será finalizado!`
        : "\nA tecla ESC foi apertada!",
      "-----------------------------------------------------------------------------"
    );

    // O socket é fechado depois de alguns segundos, para que
    // se existir alguma mensagem que o servidor ainda precise mandar,
    // elas sejam recebidas e contabilizadas nas estatísticas
    console.log("Fechando o socket depois de 5s...");
    setTimeout(() => {
      client.close();
    }, 5000);
  }
};

// Inicialização do cliente UDP
console.log(
  "%s%s%s%s%s",
  "=============================================================================\n",
  "Inicio da execucao: udp_client.js\n",
  "Disciplina Redes de Computadores II  -  Prof. Elias P. Duarte Jr.\n",
  "Aluna: Gabriel de Almeida Sales Evaristo - GRR20165266\n",
  "=============================================================================\n"
);

start_client();

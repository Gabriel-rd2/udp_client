#!/bin/bash

# Roda 3 clientes UDP, utiliando 6fps, 12fps e 24fps
node udp_client --fps $2 --duration $1 --source ./videos/exemplo.mp4 > ./logs/client_log-$2fps-$1s&
node udp_client --fps $3 --duration $1 --source ./videos/exemplo2.mp4 > ./logs/client_log2-$3fps-$1s&
node udp_client --fps $4 --duration $1 > ./logs/client_log3-$4fps-$1s&

# O caracte '&' é para rodar os processos anteriores em background
# O comando a seguir espera eles terminarem
wait

echo "Todos os clientes terminaram!"

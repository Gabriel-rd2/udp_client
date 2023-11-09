#!/bin/bash

# Roda 3 clientes UDP, utiliando 6fps, 12fps e 24fps
node udp_client --fps 6 --duration $1 --source ./videos/exemplo.mp4 > ./logs/client_log-6fps&
node udp_client --fps 12 --duration $1 --source ./videos/exemplo2.mp4 > ./logs/client_log--12fps&
node udp_client --fps 24 --duration $1 > client_log3-24fps&

# O caracte '&' é para rodar os processos anteriores em background
# O comando a seguir espera eles terminarem
wait

echo "Todos os clientes terminaram!"

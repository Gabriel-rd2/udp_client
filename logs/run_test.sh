#!/bin/bash

# Roda 3 clientes UDP, utiliando 6fps, 12fps e 24fps
node ../udp_client --fps $2 --duration $1 --source ../videos/exemplo.mp4 > client_log1-$2fps-$1s.txt&
node ../udp_client --fps $3 --duration $1 --source ../videos/exemplo2.mp4 > client_log2-$3fps-$1s.txt&
node ../udp_client --fps $4 --duration $1 > client_log3-$4fps-$1s.txt&

# O caracte '&' é para rodar os processos anteriores em background
# O comando a seguir espera eles terminarem
wait

echo "Todos os clientes terminaram!"

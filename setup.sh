#!/bin/bash
set -e

PYTHON_PORT="${PORT:-5000}"

activate_venv() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        source .venv/Scripts/activate
    else
        source .venv/bin/activate
    fi
}

install_node() {
    echo "Instalando dependências do Node.js..."
    cd node-api
    npm install
    cd -
}

install_python() {
    echo "Instalando dependências do Python..."
    cd python-llm

    if [[ ! -d .venv ]]; then
        python3 -m venv .venv
    fi
    activate_venv
    pip install -r requirements.txt
    cd -
}

start_node() {
    echo "Iniciando Node API..."
    cd node-api
    npm run dev
}

start_python() {
    echo "Iniciando Python LLM service na porta ${PYTHON_PORT}..."
    cd python-llm
    activate_venv
    uvicorn app.main:app --reload --host 0.0.0.0 --port "${PYTHON_PORT}"
}

test_node() {
    echo "Rodando testes do Node..."
    ( cd node-api && npm test )
}

test_python() {
    echo "Rodando testes do Python..."
    (
        cd python-llm
        .venv/bin/python -m pytest tests/ -v
    )
}

test_integration() {
    echo "Rodando testes de integração (Node ↔ Python)..."
    ( cd node-api && npm run test:integration )
}

case $1 in
    install-node)    install_node ;;
    install-python)  install_python ;;
    install)         install_node && install_python ;;
    start-node|dev-node)       start_node ;;
    start-python|dev-python)   start_python ;;
    test-node)         test_node ;;
    test-python)       test_python ;;
    test-integration)  test_integration ;;
    test)              test_node && test_python && test_integration ;;
    *)
        echo "Comandos disponíveis:"
        echo "  install            - Instala dependências do Node e do Python"
        echo "  install-node       - Instala dependências do Node.js"
        echo "  install-python     - Instala dependências do Python (cria .venv)"
        echo "  start-node         - Inicia a Node API"
        echo "  start-python       - Inicia o serviço Python"
        echo "  test               - Roda todos os testes (unit + integração)"
        echo "  test-node          - Roda testes unitários do Node"
        echo "  test-python        - Roda testes do Python"
        echo "  test-integration   - Roda testes de integração end-to-end"
        exit 1
        ;;
esac

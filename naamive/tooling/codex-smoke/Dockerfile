FROM node:24-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip git bubblewrap \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @openai/codex@0.144.0

COPY naamive/runtime/python /tmp/naamive-runtime
RUN python3 -m pip install --break-system-packages /tmp/naamive-runtime

RUN useradd --create-home --shell /bin/bash codex \
    && install -d --owner=codex --group=codex /home/codex/.codex
USER codex
WORKDIR /work/naamive
ENV HOME=/home/codex

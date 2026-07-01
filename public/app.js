(() => {
  const WHATSAPP = 'http://wa.me/5527998907516';
  const INSTAGRAM = '@embarquealto';

  const state = {
    mode: 'voo',
    pacoteTipo: 'hotel',
    imageDataUrl: null,
  };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (id) => parseFloat((($(id) || {}).value || '').toString().replace(',', '.')) || 0;
  const setVal = (id, v) => { const el = $(id); if (el != null && v !== undefined && v !== null) el.value = v; };

  const EMOJI_RULES = [
    { emoji: '🏖', words: ['porto seguro', 'maceio', 'maceió', 'natal', 'fortaleza', 'recife', 'salvador', 'ilheus', 'ilhéus', 'maragogi', 'jericoacoara', 'joao pessoa', 'joão pessoa', 'aracaju', 'nordeste', 'praia do forte'] },
    { emoji: '🏰', words: ['paris', 'roma', 'lisboa', 'madri', 'madrid', 'londres', 'amsterda', 'barcelona', 'milao', 'milão', 'europa', 'veneza', 'praga', 'atenas'] },
    { emoji: '🗽', words: ['miami', 'orlando', 'nova york', 'nova iorque', 'new york', 'las vegas', 'los angeles', 'chicago', 'eua', 'estados unidos'] },
    { emoji: '🏝', words: ['cancun', 'cancún', 'punta cana', 'aruba', 'bahamas', 'caribe', 'jamaica'] },
    { emoji: '❄️', words: ['bariloche', 'ushuaia', 'aspen', 'colorado', 'gramado', 'canela', 'neve'] },
    { emoji: '⛰️', words: ['serra', 'campos do jordao', 'campos do jordão', 'monte verde'] },
    { emoji: '🌴', words: ['rio de janeiro', 'florianopolis', 'florianópolis', 'buzios', 'búzios', 'angra', 'ilhabela', 'guaruja', 'guarujá', 'ubatuba'] },
  ];
  function guessEmoji(destino) {
    const d = (destino || '').toLowerCase();
    for (const rule of EMOJI_RULES) {
      if (rule.words.some((w) => d.includes(w))) return rule.emoji;
    }
    return '🌴';
  }

  function capitalizeWords(s) {
    return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }

  // ---------- heurísticas de OCR (100% gratuito, roda no navegador) ----------
  function extractTimes(text) {
    const re = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    return [...text.matchAll(re)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  }

  function extractDates(text) {
    const re = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
    return [...text.matchAll(re)].map((m) => {
      const d = m[1].padStart(2, '0');
      const mo = m[2].padStart(2, '0');
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${d}/${mo}/${y}`;
    });
  }

  function extractMilhas(text) {
    const m = text.match(/(\d[\d.,]{2,9})\s*milhas/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isFinite(n) ? n : null;
  }

  function extractValor(text) {
    const m = text.match(/r\$\s*([\d]{1,3}(?:\.\d{3})*(?:,\d{2})?)/i);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function extractDiarias(text) {
    const m = text.match(/(\d+)\s*(di[aá]rias?|noites?)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function detectCompanhia(text) {
    const t = text.toLowerCase();
    if (t.includes('latam')) return 'LATAM Airlines Brasil';
    if (t.includes('smiles') || t.includes(' gol') || t.startsWith('gol')) return 'GOL Linhas Aéreas';
    if (t.includes('azul')) return 'Azul Linhas Aéreas';
    return null;
  }

  function detectDireto(text) {
    if (/(escala|conex[aã]o|parada)/i.test(text)) return false;
    if (/direto/i.test(text)) return true;
    return null;
  }

  function detectDestinoConhecido(text) {
    const t = text.toLowerCase();
    for (const rule of EMOJI_RULES) {
      for (const w of rule.words) {
        if (w.length > 3 && t.includes(w)) return capitalizeWords(w);
      }
    }
    return null;
  }

  function detectTipoPacote(text) {
    const t = text.toLowerCase();
    if (/(transfer|traslado)/.test(t)) return 'transfer';
    if (/(hotel|check-?in|di[aá]ria)/.test(t)) return 'hotel';
    return null;
  }

  function detectModalidade(text) {
    const t = text.toLowerCase();
    if (t.includes('privativo')) return 'Privativo';
    if (t.includes('compartilhado')) return 'Compartilhado';
    return null;
  }

  function parseVooTexto(text) {
    const datas = extractDates(text);
    const horas = extractTimes(text);
    return {
      destino: detectDestinoConhecido(text),
      companhia: detectCompanhia(text),
      direto: detectDireto(text),
      milhas: extractMilhas(text),
      ida: datas[0] ? { data: datas[0], saida: horas[0] || null, chegada: horas[1] || null } : null,
      volta: datas[1] ? { data: datas[1], saida: horas[2] || null, chegada: horas[3] || null } : null,
    };
  }

  function parsePacoteTexto(text) {
    const datas = extractDates(text);
    const tipo = detectTipoPacote(text);
    return {
      destino: detectDestinoConhecido(text),
      tipo,
      valor: extractValor(text),
      hotel: tipo === 'transfer' ? null : {
        checkin: datas[0] || null,
        checkout: datas[1] || null,
        diarias: extractDiarias(text),
      },
      transfer: tipo === 'hotel' ? null : {
        modalidade: detectModalidade(text),
      },
    };
  }

  // ---------- mode tabs ----------
  const modeTabs = document.querySelectorAll('.mode-tab');
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      modeTabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      state.mode = tab.dataset.mode;
      applyMode();
    });
  });

  function applyMode() {
    const isVoo = state.mode === 'voo';
    $('fieldsVoo').hidden = !isVoo;
    $('fieldsPacote').hidden = isVoo;
    $('labelMilheiro').style.display = isVoo ? '' : 'none';
    document.querySelector('.milheiro-presets').style.display = isVoo ? '' : 'none';
    $('valorDiretoWrap').hidden = isVoo;
    resetResult();
  }

  // ---------- pacote hotel/transfer segmented ----------
  document.querySelectorAll('#pacoteTipoSeg .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pacoteTipoSeg .seg-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.pacoteTipo = btn.dataset.tipo;
      $('pacoteHotelFields').hidden = state.pacoteTipo !== 'hotel';
      $('pacoteTransferFields').hidden = state.pacoteTipo !== 'transfer';
    });
  });

  // ---------- milheiro presets ----------
  document.querySelectorAll('.preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      setVal('valorMilheiro', btn.dataset.v);
    });
  });

  // ---------- dropzone / upload ----------
  const dropzone = $('dropzone');
  const fileInput = $('fileInput');
  const previewImg = $('previewImg');
  const dropzoneInner = $('dropzoneInner');
  const btnAnalisar = $('btnAnalisar');

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imageDataUrl = reader.result;
      previewImg.src = state.imageDataUrl;
      previewImg.hidden = false;
      dropzoneInner.hidden = true;
      btnAnalisar.disabled = false;
      setStatus('', '');
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    handleFile(e.dataTransfer.files[0]);
  });

  function setStatus(text, kind) {
    const el = $('analiseStatus');
    el.textContent = text;
    el.className = 'hint' + (kind ? ` is-${kind}` : '');
  }

  btnAnalisar.addEventListener('click', async () => {
    if (!state.imageDataUrl) return;
    const spinner = btnAnalisar.querySelector('.btn-spinner');
    const label = $('btnAnalisarLabel');
    btnAnalisar.disabled = true;
    spinner.hidden = false;
    setStatus('', '');
    $('ocrRawWrap').hidden = true;

    try {
      const { data } = await Tesseract.recognize(state.imageDataUrl, 'por', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            label.textContent = `Lendo print… ${Math.round((m.progress || 0) * 100)}%`;
          } else {
            label.textContent = 'Lendo print…';
          }
        },
      });
      const texto = data.text || '';

      $('ocrRawText').textContent = texto.trim() || '(nenhum texto reconhecido)';
      $('ocrRawWrap').hidden = false;

      if (state.mode === 'voo') fillVoo(parseVooTexto(texto));
      else fillPacote(parsePacoteTexto(texto));

      setStatus('✓ OCR gratuito preencheu o que conseguiu ler. Confira todos os campos antes de gerar o alerta.', 'ok');
    } catch (err) {
      setStatus(err.message || 'Erro ao ler o print. Preencha manualmente.', 'error');
    } finally {
      btnAnalisar.disabled = false;
      spinner.hidden = true;
      label.textContent = 'Ler print (OCR grátis)';
    }
  });

  function fillVoo(d) {
    setVal('v_origem', d.origem);
    setVal('v_destino', d.destino);
    setVal('v_companhia', d.companhia);
    if (d.destino) $('v_emoji').value = guessEmoji(d.destino);
    if (typeof d.direto === 'boolean') $('v_direto').checked = d.direto;
    if (d.milhas) setVal('v_milhas', d.milhas);
    if (d.ida) { setVal('v_ida_data', d.ida.data); setVal('v_ida_saida', d.ida.saida); setVal('v_ida_chegada', d.ida.chegada); }
    if (d.volta) { setVal('v_volta_data', d.volta.data); setVal('v_volta_saida', d.volta.saida); setVal('v_volta_chegada', d.volta.chegada); }
  }

  function fillPacote(d) {
    setVal('p_destino', d.destino);
    if (d.destino) $('p_emoji').value = guessEmoji(d.destino);
    if (d.tipo === 'transfer' || d.tipo === 'hotel') {
      document.querySelectorAll('#pacoteTipoSeg .seg-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.tipo === d.tipo));
      state.pacoteTipo = d.tipo;
      $('pacoteHotelFields').hidden = d.tipo !== 'hotel';
      $('pacoteTransferFields').hidden = d.tipo !== 'transfer';
    }
    if (d.hotel) {
      setVal('p_hotel_nome', d.hotel.nome);
      setVal('p_hotel_regime', d.hotel.regime);
      setVal('p_hotel_checkin', d.hotel.checkin);
      setVal('p_hotel_checkout', d.hotel.checkout);
      setVal('p_hotel_diarias', d.hotel.diarias);
    }
    if (d.transfer) {
      setVal('p_transfer_trajeto', d.transfer.trajeto);
      setVal('p_transfer_modalidade', d.transfer.modalidade);
    }
    if (d.valor) setVal('valorDireto', d.valor);
  }

  // ---------- calculo + alerta ----------
  function resetResult() {
    $('calcBox').hidden = true;
    $('alertBox').hidden = true;
    $('emptyState').hidden = false;
  }

  function computeSteps(baseValue, taxas) {
    const line1 = baseValue;
    const line2 = line1 + taxas;
    const line3 = line2 * 1.10;
    const line4 = line3 / 12;
    return { line1, line2, line3, line4 };
  }

  function renderCalc(labelLinha1, steps) {
    $('calcLine1').textContent = `${labelLinha1} = R$ ${brl(steps.line1)}`;
    $('calcLine2').textContent = `+ Taxas = R$ ${brl(steps.line2)}`;
    $('calcLine3').textContent = `+ 10% de lucro = R$ ${brl(steps.line3)}`;
    $('calcLine4').textContent = `12x = R$ ${brl(steps.line4)}`;
    $('calcBox').hidden = false;
  }

  function buildFooter() {
    return `📞 Precisa de outras datas? Consulte outras disponibilidades com a gente.\n📲 Fale com a gente: ${WHATSAPP}\n📸 Siga no Instagram: ${INSTAGRAM}`;
  }

  function gerarVoo() {
    const milhas = num('v_milhas');
    const milheiro = num('valorMilheiro');
    const taxas = num('valorTaxas');

    if (milheiro <= 0) {
      setStatus('Informe o valor do milheiro antes de gerar o alerta.', 'error');
      $('valorMilheiro').focus();
      return;
    }

    const steps = computeSteps((milhas / 1000) * milheiro, taxas);
    renderCalc('Milhas × Valor do milheiro ÷ 1.000', steps);

    const emoji = $('v_emoji').value;
    const origem = ($('v_origem').value || '').trim();
    const destino = ($('v_destino').value || '').trim();
    const companhia = ($('v_companhia').value || '').trim();
    const direto = $('v_direto').checked;

    const idaData = $('v_ida_data').value || '';
    const idaSaida = $('v_ida_saida').value || '';
    const idaChegada = $('v_ida_chegada').value || '';
    const voltaData = $('v_volta_data').value || '';
    const voltaSaida = $('v_volta_saida').value || '';
    const voltaChegada = $('v_volta_chegada').value || '';

    const texto = [
      `${emoji} ${destino.toUpperCase()} no seu roteiro!`,
      '',
      `Viaje de ${origem} para ${destino} e economize!`,
      '',
      `🛫 Ida: ${idaData}`,
      `Saída ${idaSaida} | Chegada ${idaChegada}`,
      '',
      `🛬 Volta: ${voltaData}`,
      `Saída ${voltaSaida} | Chegada ${voltaChegada}`,
      '',
      `✈️ Companhia: ${companhia}`,
      '🧳 1 bagagem de mão incluída',
      direto ? '✈️ Voo Direto' : '✈️ Voos com escala',
      '',
      `💰 Só R$ ${brl(steps.line3)} à vista ou 12x de R$ ${brl(steps.line4)}`,
      'Promoção relâmpago, aproveite!',
      '',
      buildFooter(),
    ].join('\n');

    showAlert(texto);
  }

  function gerarPacote() {
    const valorBase = num('valorDireto');
    const taxas = num('valorTaxas');

    if (valorBase <= 0) {
      setStatus('Informe o valor total do pacote antes de gerar o alerta.', 'error');
      $('valorDireto').focus();
      return;
    }

    const steps = computeSteps(valorBase, taxas);
    renderCalc('Valor do pacote', steps);

    const emoji = $('p_emoji').value;
    const destino = ($('p_destino').value || '').trim();
    let corpo = '';

    if (state.pacoteTipo === 'hotel') {
      const nome = ($('p_hotel_nome').value || '').trim();
      const regime = ($('p_hotel_regime').value || '').trim();
      const checkin = $('p_hotel_checkin').value || '';
      const checkout = $('p_hotel_checkout').value || '';
      const diarias = $('p_hotel_diarias').value || '';
      corpo = [
        `Hospede-se em ${nome} e economize!`,
        '',
        `🏨 Hotel: ${nome}`,
        `📅 Check-in: ${checkin} | Check-out: ${checkout}`,
        `🍽 Regime: ${regime}`,
        `🛏 ${diarias} diárias`,
      ].join('\n');
    } else {
      const trajeto = ($('p_transfer_trajeto').value || '').trim();
      const modalidade = ($('p_transfer_modalidade').value || '').trim();
      corpo = [
        `Traslado ${trajeto} com toda comodidade!`,
        '',
        `🚐 Transfer: ${trajeto}`,
        `🧍 Modalidade: ${modalidade}`,
      ].join('\n');
    }

    const texto = [
      `${emoji} ${destino.toUpperCase()} no seu roteiro!`,
      '',
      corpo,
      '',
      `💰 Só R$ ${brl(steps.line3)} à vista ou 12x de R$ ${brl(steps.line4)}`,
      'Promoção relâmpago, aproveite!',
      '',
      buildFooter(),
    ].join('\n');

    showAlert(texto);
  }

  function showAlert(texto) {
    $('alertText').textContent = texto;
    $('alertBox').hidden = false;
    $('emptyState').hidden = true;
    setStatus('', '');
  }

  $('btnGerar').addEventListener('click', () => {
    if (state.mode === 'voo') gerarVoo();
    else gerarPacote();
  });

  $('btnCopiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('alertText').textContent);
      const btn = $('btnCopiar');
      const original = btn.textContent;
      btn.textContent = '✓ Copiado!';
      btn.classList.add('is-copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('is-copied'); }, 1800);
    } catch {
      setStatus('Não foi possível copiar automaticamente. Selecione o texto manualmente.', 'error');
    }
  });

  applyMode();
})();

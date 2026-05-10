// ── B-Mak ServicePro — pdf.js ──
// Shared PDF builder. Used by rapport.html and historique.html.

function buildReportPDF(r, selClientOverride, selMachineOverride, savedSigImgOverride) {
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'letter'});
  const W = 215.9, margin = 16; let y = 0;
  const C = {
    navy:[2,40,64], teal:[3,127,140], tealL:[230,244,245],
    gray:[242,242,242], border:[205,216,224], text3:[108,122,137]
  };

  const c = selClientOverride || DB.clientById(r.cid) || {};
  const m = selMachineOverride || (r.mid ? DB.machineById(r.mid) : null);
  const sigImg = savedSigImgOverride || r.sigImg || r.sig_img || null;
  const tech = r.tech || '—';
  const rnum = (r.rnum && r.rnum.length < 20) ? r.rnum : '—';
  const dur  = r.dur  || '—';
  const date = r.date || '—';

  // ── Header ──
  doc.setFillColor(...C.navy); doc.rect(0,0,W,38,'F');
  doc.setFont('helvetica','bolditalic'); doc.setFontSize(24);
  doc.setTextColor(...C.teal); doc.text('B-Mak', margin, 24);
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.setTextColor(180,190,200);
  doc.text('RAPPORT DE SERVICE  /  SERVICE REPORT', margin+50, 20);
  doc.setTextColor(255,255,255); doc.setFontSize(9);
  doc.text('No: '+rnum, W-margin, 17, {align:'right'});
  doc.text(fmtDate(date), W-margin, 24, {align:'right'});
  doc.setFontSize(7); doc.setTextColor(130,160,180);
  doc.text('bmak.ca', W-margin, 31, {align:'right'});
  // Decorative teal accent line
  doc.setFillColor(...C.teal); doc.rect(0, 38, W, 1.5, 'F');
  y = 46;

  // ── Client box ──
  doc.setFillColor(...C.gray); doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, 86, 48, 3, 3, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...C.teal);
  doc.text('CLIENT', margin+4, y+8);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...C.navy);
  const cn = doc.splitTextToSize(c.nom||'—', 76);
  doc.text(cn, margin+4, y+15);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.text3);
  let cy2 = y+15+cn.length*5;
  if(c.adresse){doc.text(c.adresse, margin+4, cy2); cy2+=5;}
  if(c.ville){doc.text(c.ville+', '+c.province, margin+4, cy2); cy2+=5;}
  if(c.tel) doc.text(c.tel, margin+4, cy2);

  // ── Machine box ──
  const mx = margin+90;
  doc.setFillColor(...C.gray); doc.roundedRect(mx, y, W-margin-mx, 48, 3, 3, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...C.teal);
  doc.text('MACHINE / ÉQUIPEMENT', mx+4, y+8);
  if(m){
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...C.navy);
    doc.text(m.type||'—', mx+4, y+15);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.text3);
    doc.text('Marque: '+(m.marque||'—'), mx+4, y+22);
    if(m.modele&&m.modele!=='-') doc.text('Modèle: '+m.modele, mx+4, y+28);
    doc.text('S/N: '+(m.serial||'—'), mx+4, y+34);
  } else {
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...C.text3);
    doc.text('Non spécifiée', mx+4, y+18);
  }
  y += 54;

  // ── Info band ──
  doc.setFillColor(...C.tealL); doc.roundedRect(margin, y, W-margin*2, 13, 2, 2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...C.teal);
  doc.text('TECHNICIEN', margin+4, y+5);
  doc.text('DATE', margin+60, y+5);
  doc.text('DURÉE', margin+100, y+5);
  doc.text('No.', margin+130, y+5);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.navy);
  doc.text(tech, margin+4, y+11);
  doc.text(fmtDate(date), margin+60, y+11);
  doc.text(dur, margin+100, y+11);
  doc.text(rnum, margin+130, y+11);
  y += 19;

  function section(fr, en) {
    doc.setFillColor(...C.navy); doc.rect(margin, y, W-margin*2, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text(fr+' / '+en, margin+3, y+5); y += 11;
  }
  function hexToRgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }

  // ── Tasks ──
  (r.taches || []).forEach((t, i) => {
    if(y > 240) { doc.addPage(); y = 18; }
    section('TÂCHE '+(i+1)+(t.itype?' — '+t.itype.toUpperCase():''), 'TASK '+(i+1));

    const dlines = doc.splitTextToSize(t.desc||'—', W-margin*2-8);
    const dh = Math.max(16, dlines.length*5+6);
    doc.setFillColor(255,255,255); doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W-margin*2, dh, 2, 2, 'FD');
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...C.navy);
    doc.text(dlines, margin+4, y+6); y += dh+4;

    if(t.etat) {
      const s = statusSty(t.etat);
      doc.setFillColor(...hexToRgb(s.bg)); doc.setDrawColor(...hexToRgb(s.border)); doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, W-margin*2, 12, 2, 2, 'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...hexToRgb(s.color));
      doc.text('ÉTAT: '+t.etat, margin+4, y+9); y += 17;
    }
    if(t.reco) {
      const rlines = doc.splitTextToSize(t.reco, W-margin*2-8);
      const rh = Math.max(14, rlines.length*5+6);
      doc.setFillColor(255,248,238); doc.setDrawColor(180,80,0); doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, W-margin*2, rh, 2, 2, 'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(180,80,0);
      doc.text('RECOMMANDATIONS', margin+4, y+5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.navy);
      doc.text(rlines, margin+4, y+11); y += rh+6;
    }
    const photos = Array.isArray(t.photos) ? t.photos : [];
    if(photos.length) {
      if(y > 200) { doc.addPage(); y = 18; }
      const cols = 3;
      const iw = (W - margin*2 - cols*4) / cols;
      const ih = 40; // hauteur fixe pour toutes les photos
      photos.slice(0,9).forEach((src, pi) => {
        if(pi % cols === 0 && pi > 0) { y += ih + 5; }
        if(y + ih > 262) { doc.addPage(); y = 18; }
        const col = pi % cols;
        const px = margin + col*(iw+4);
        try {
          // Déterminer le format: URL externe ou base64
          let fmt = 'JPEG';
          if(typeof src === 'string') {
            if(src.startsWith('data:image/png')) fmt = 'PNG';
            else if(src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) fmt = 'JPEG';
            else fmt = 'JPEG'; // URL Supabase Storage → JPEG par défaut
          }
          doc.addImage(src, fmt, px, y, iw, ih, '', 'FAST');
          doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
          doc.rect(px, y, iw, ih, 'S');
          doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(150,150,150);
          doc.text('Photo '+(pi+1), px+2, y+ih-2);
        } catch(e) { console.warn('PDF photo error:', e); }
      });
      const rows = Math.ceil(Math.min(photos.length,9)/cols);
      y += rows*(ih+5)+4;
    }
    y += 4;
  });

  // ── Technicien sign-off ──
  if(y > 240) { doc.addPage(); y = 18; }
  doc.setFillColor(...C.gray); doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, W-margin*2, 22, 2, 2, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...C.teal);
  doc.text('RAPPORT COMPLÉTÉ PAR / COMPLETED BY', margin+4, y+7);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.4);
  doc.line(W-margin-60, y+16, W-margin-4, y+16);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...C.navy);
  doc.text(tech, W-margin-4, y+13, {align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C.text3);
  doc.text('Technicien / Technician', W-margin-4, y+20, {align:'right'});
  y += 28;

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for(let p=1; p<=totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.navy); doc.rect(0, 270, W, 9.4, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,175,190);
    doc.text('B-Mak ServicePro · '+rnum+' · '+new Date().toLocaleDateString('fr-CA'), margin, 275.5);
    doc.setTextColor(...C.teal);
    doc.text('Page '+p+'/'+totalPages, W/2, 275.5, {align:'center'});
    doc.setTextColor(160,175,190);
    doc.text('Document confidentiel / Confidential', W-margin, 275.5, {align:'right'});
  }

  const filename = 'Rapport_BMak_'+(c.nom||'client').replace(/[^a-zA-Z0-9]/g,'_')+'_'+date+'.pdf';
  doc.save(filename);
}

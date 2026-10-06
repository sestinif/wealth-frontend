# Wealth — redesign «Mercury scuro»

Data: 06/10/2026 · Stato: in attesa di approvazione di Federico

## 1. Obiettivo

Portare tutta l'app Wealth allo stile di Mercury in versione scura: calma, ariosa, un carattere solo, quasi zero colore, filetti sottili. Oggi l'app è un miscuglio di giri precedenti (grana sullo sfondo, vignettatura, sfumature sulle card, tre caratteri) e il Diary sembra un pannello di amministrazione.

Nessuna funzione nuova e nessuna modifica al backend: cambia solo come si vede e come si naviga quello che c'è già.

## 2. Decisioni approvate da Federico (06/10/2026)

1. Riferimento: **Mercury**.
2. Tema: **scuro** (variante A). Niente tema chiaro.
3. Diary desktop e telefono come da mockup: registro unico, tre linguette, azioni dentro la scheda.
4. Dashboard desktop e telefono come da mockup: grafico dentro la card del patrimonio, ripartizione come lista unica, **niente ciambella**, tabella delle posizioni.
5. Si fa su tutta l'app, una pagina alla volta.
6. Personals avrà lo stesso design, ma è un progetto a parte (vedi §9).

## 3. Fondamenta (valgono per ogni pagina)

Regola di lavoro: **i nomi delle variabili CSS restano gli stessi, cambiano i valori.** Così ogni pagina si alza da sola al primo passo, e le pagine non ancora rifatte non si rompono.

### Colori

| Variabile | Oggi | Nuovo |
|---|---|---|
| `--bg` | `#0B0B0D` | `#14141B` |
| `--bg-card` | `#15151A` | `#1B1B24` |
| `--bg-elev`, `--bg-card-2`, `--bg-input` | `#1C1C22` | `#23232E` |
| `--bg-hover` | `#20202A` | `#262632` |
| `--bg-card-grad` | sfumatura | colore pieno `#1B1B24` |
| `--border` | `rgba(255,255,255,0.08)` a 0.5px | stesso colore, **1px** |
| `--text-1` | `#F4F3F1` | `#EDEDF3` |
| `--text-2` | `#A8A6A2` | `#9A9AA8` |
| `--text-3` | `#7A7880` | `#9A9AA8` (un solo grigio secondario) |
| `--accent`, `--accent-soft` | viola `#8B7BFF` | indaco `#8D9BFF` |
| `--accent-2`, `--accent-strong` | `#7C5CFC` | `#8D9BFF` |
| `--green` | `#34D399` | `#4FD1A1` |
| `--red` | `#FB7185` | `#F58A9B` |
| `--stock` | ambra | indaco pieno `#8D9BFF` |
| `--cash` | blu | indaco medio `#5F69B8` |
| categoria crypto (oggi `--accent`) | viola | indaco scuro `#3D4272` (nuova `--crypto`) |
| `--dry` | verde acqua | grigio `#2A2A36` |

Il colore porta un solo significato: verde = guadagno o entrata, rosa = perdita. Tutto il resto è indaco o grigio.

### Carattere

- **Inter soltanto**, pesi 400 e 500. Cifre tabulari attive ovunque (`font-feature-settings: "tnum"`).
- `--font-num` resta come variabile ma punta a Inter (è usata in 48 punti: così non si toccano).
- **Esce Space Grotesk. Esce Instrument Serif**: il saluto della Dashboard diventa Inter 24–26px peso 400.
- `index.html`: il link ai font carica solo Inter 400 e 500.
- Scala: titolo pagina 26px/400 · cifra principale 38px/400 (32px sul telefono) · indicatori 20px · testo 14px · etichette e secondari 12–13px. **Niente sotto i 12px.**
- Centesimi delle cifre grandi in grigio secondario.
- Etichette in minuscolo normale: via il maiuscoletto spaziato (`letter-spacing` largo, `text-transform: uppercase`).

### Superfici

- Via la grana (`body::before`), via la vignettatura (`body::after`), via la sfumatura radiale nel `body` di `index.html`.
- Via tutte le 16 sfumature e le ombre decorative. Restano solo le ombre funzionali della scheda mobile e dei menu.
- Card: fondo pieno `--bg-card`, bordo 1px, raggio **12px**. Controlli: raggio **8px**.
- Bottone primario: fondo indaco pieno, testo scuro `#14141B`, nessun alone al passaggio.
- Liste: righe separate da un filetto 1px, mai card arrotondate una per riga.
- `theme-color` in `index.html` → `#14141B`.

### Cornice dell'app

Sidebar e barra in alto prendono gli stessi materiali: fondo `--bg`, filetto 1px, voce attiva con testo `--text-1` e fondo `--bg-elev`, senza bordi colorati.

## 4. Componenti condivisi (nuovi o rifatti)

| Componente | Cosa fa | Dove si usa |
|---|---|---|
| `PageHead` | Titolo 26px a sinistra, azione principale a destra (bottone con testo su desktop, tondo «+» sul telefono) | ogni pagina |
| `StatRow` | Fila di 3 indicatori senza scatola: etichetta 12px sopra, cifra sotto. Sul telefono ha due forme: nel Diary la prima cifra diventa grande (32px) e le altre due vanno in una riga di testo; nella Dashboard, dove la cifra grande è già il patrimonio, restano tre affiancate a 16px | Diary, Dashboard |
| `Tabs` | Linguette con sottolineatura indaco sulla voce attiva | Diary, Add Movement (al posto di `seg-tabs`) |
| `LedgerRow` | Riga di registro a griglia fissa: data · tondo con sigla · nome + dettaglio · importo. Sul telefono: tondo · nome + dettaglio · importo con data sotto | Diary, posizioni della Dashboard |
| `DetailSheet` | Scheda dei dettagli. Sul telefono (≤640px) sale dal basso; su desktop è un pannello a destra. Si chiude con tocco fuori, tasto Esc o trascinamento. Contiene le righe etichetta/valore e, in fondo, l'azione distruttiva | Diary, Dashboard |

Un solo meccanismo per le azioni: **si tocca la riga, si apre la scheda**. Su desktop i tre puntini compaiono al passaggio del mouse solo come segnale che la riga è cliccabile.

La cancellazione chiede conferma dentro la scheda: «Delete purchase» al primo tocco diventa «Confirm delete», al secondo cancella. Dopo 4 secondi senza conferma torna com'era.

## 5. Diary

- **Testata:** «Diary» + «Add movement».
- **Indicatori:** Total invested · Transactions (numero di acquisti) · Last purchase (data).
- **Registro unico:** acquisti e movimenti bancari nello stesso elenco, dal più recente. Oggi sono due pannelli separati.
- **Linguette:** All · Purchases · Bank.
- **Filtro asset:** un menu a tendina «All assets» a destra delle linguette, al posto della fila di bottoni. Visibile su All e Purchases; su Bank sparisce.
- **Intestazioni di mese:** nome del mese a sinistra, a destra il totale investito del mese (solo acquisti; se il mese ha solo movimenti bancari resta vuoto).
- **Riga acquisto:** nome dell'asset in chiaro (es. «Bitcoin»), sotto quantità e prezzo, importo in euro. Se pagato da un broker, il dettaglio aggiunge «· from <broker>».
- **Riga banca:** nome della banca, sotto la nota o «Money in» / «Money out», importo nella sua valuta con segno; verde se entrata.
- **Telefono:** quantità a 5 decimali e prezzo senza centesimi nella riga; il dato completo sta nella scheda.
- **Scheda:** data, quantità, prezzo, nota, provenienza dei fondi; in fondo «Delete purchase» o «Delete movement».
- La logica di cancellazione non cambia: se l'acquisto era pagato da un broker, il dry powder viene ripristinato come oggi.
- Stati vuoti: «No transactions yet» con il bottone «Add movement».

## 6. Dashboard

- **Saluto:** Inter, senza serif. A destra resta il selettore EUR/USD.
- **Card patrimonio (a sinistra, larga):** etichetta «Net worth», cifra grande, una riga con la variazione del periodo scelto, e sotto il grafico a linea sottile indaco senza riempimento. Il selettore 1W / 1M / 1Y / All sta in alto a destra della card. Il grafico oggi è un blocco a parte: entra qui.
- **Card ripartizione (a destra):** barretta sottile a segmenti + lista delle 4 categorie (Stock market, Cash, Crypto market, Dry powder) con percentuale e valore. Sostituisce ciambella, barra grande e quattro tessere. Toccando una categoria la lista dei suoi asset o conti si apre sotto la riga, come oggi.
- **Indicatori:** Profit · Return · Invested. («Invested» prende il posto di «Assets», che è un conteggio poco utile.)
- **Posizioni:** tabella Holdings · Price · Value · Profit. Nome in chiaro, quantità sotto; profitto in euro con la percentuale sotto. Sul telefono due linee per riga e la colonna prezzo sparisce.
- **Scheda posizione:** prezzo, prezzo medio, variazione 24h, quantità, investito, profitto, e l'interruttore «Include in totals» (oggi sta nella riga).
- **Speculative · Not included:** stessa tabella, sotto, in grigio.
- **Market overview:** resta chiuso di default, con i nuovi materiali.
- Sul telefono le due card vanno una sotto l'altra.

## 7. Le altre pagine

Add Movement, Reports, Charts, DCA Calculator, Settings, Login, Setup.

Con le fondamenta del §3 cambiano già aspetto da sole. Poi ogni pagina riceve un passaggio per usare i componenti del §4 (testata, linguette, righe, indicatori).

Per **Add Movement** e **Charts**, dove cambia anche la disposizione, Federico vede il mockup prima del codice. Le altre seguono i componenti già approvati.

Grafici (Charts, Reports): una sola tinta indaco e i suoi toni, griglia quasi invisibile, niente riempimenti a sfumatura.

## 8. Ordine di lavoro

**Fase 1** (un solo piano di implementazione):
1. Fondamenta: variabili, carattere, superfici, cornice dell'app.
2. Componenti condivisi.
3. Diary.
4. Dashboard.

**Fase 2** (piano successivo): Add Movement → Charts → Reports → Calculator → Settings → Login e Setup.

Ogni passo è un commit a sé, così si può tornare indietro pagina per pagina.

## 9. Fuori da questo progetto

- Backend e dati: non si toccano.
- Funzioni nuove (modifica di un acquisto, ricerca nel registro, tema chiaro).
- **Personals:** stesso design, progetto successivo con il suo documento. Nota tecnica: Personals usa Tailwind, Wealth CSS semplice, quindi le fondamenta si portano come valori (colori, carattere, raggi), non come file copiato.

## 10. Verifica

- `npm run build` senza errori a ogni passo.
- Controllo visivo a **390px e a desktop** per ogni pagina toccata (Federico usa l'app dal telefono).
- Nell'app non si entra senza la password di Federico: il controllo si fa su una pagina di prova locale che usa il foglio di stile vero e i componenti veri con dati di esempio. Dopo il deploy, l'ultima parola è di Federico sull'app reale.
- Nessun elemento decorativo aggiunto senza richiesta. Se un ornamento crea un problema di layout, si toglie.

## 11. Rilascio

Il deploy parte da solo con il push su `main` (Vercel). Il token GitHub salvato nel repo è scaduto: finché non c'è quello nuovo, il push lo lancia Federico.

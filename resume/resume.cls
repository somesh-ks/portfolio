% Minimal one-page resume class. Content lives in resume.tex.
\ProvidesClass{resume}[2026/11/22 Minimal resume]
\LoadClass[10pt,a4paper]{article}

\RequirePackage[a4paper,margin=15mm]{geometry}
\RequirePackage{fontspec}
\setmainfont{texgyreheros}[
  Extension=.otf, UprightFont=*-regular, BoldFont=*-bold,
  ItalicFont=*-italic, BoldItalicFont=*-bolditalic]
\RequirePackage[dvipsnames]{xcolor}
\RequirePackage[hidelinks]{hyperref}

\definecolor{muted}{gray}{0.42}
\definecolor{rule}{gray}{0.82}

\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\linespread{1.15}
\AtBeginDocument{\raggedright}
\hyphenpenalty=10000
\exhyphenpenalty=10000

% Header: name, then one muted contact line.
\newcommand{\header}[2]{%
  {\fontsize{20}{24}\selectfont\bfseries #1}\par\vspace{3pt}
  {\color{muted}#2}\par\vspace{10pt}}

% Section label: small tracked caps with a hairline under it.
\renewcommand{\section}[1]{%
  \vspace{11pt}%
  {\footnotesize\bfseries\color{muted}\MakeUppercase{#1}}\par\vspace{3pt}%
  {\color{rule}\hrule height 0.4pt}\vspace{6pt}}

% Role: title, organisation, dates on the right, place muted.
\newcommand{\role}[4]{%
  \vspace{2pt}{\bfseries #1}, #2\hfill{\color{muted}#3 · #4}\par\vspace{4pt}}

% Project: name, muted context, then one short outcome line.
\newcommand{\project}[3]{%
  {\bfseries #1}\enspace{\color{muted}#2}\par
  #3\par\vspace{6pt}}

% Two-column row: label left, text right.
\newcommand{\row}[2]{%
  {\small\hangindent=24mm\hangafter=1
  \makebox[24mm][l]{\color{muted}#1}#2\par}\vspace{3pt}}

% Education line: degree left, school right.
\newcommand{\degree}[2]{{\small #1}\hfill{\small\color{muted}#2}\par\vspace{2pt}}

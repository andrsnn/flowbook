<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/git-branch.svg" width="80" height="80" alt="Flowbook Logo" />
</p>

<h1 align="center">Flowbook</h1>

<p align="center">
  <strong>Transform complex runbooks into interactive decision flowcharts with AI</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#search">Search</a> •
  <a href="#export-options">Export</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Claude-AI-orange?style=flat-square" alt="Claude AI" />
  <img src="https://img.shields.io/badge/Gemini-AI-blue?style=flat-square" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/React_Flow-11-purple?style=flat-square" alt="React Flow" />
</p>

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://gist.githubusercontent.com/user-attachments/assets/flowbook-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://gist.githubusercontent.com/user-attachments/assets/flowbook-light.svg">
    <img alt="Flowbook Demo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjUwIiBoZWlnaHQ9IjQ4MCIgdmlld0JveD0iMCAwIDY1MCA0ODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwZDExMTc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzE2MWIyMjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InB1cnBsZUdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojODk1N2U1O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNhMzcxZjc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmVlbkdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMjM4NjM2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMyZWEwNDM7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJibHVlR3JhZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZjZmZWI7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzM4OGJmZDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InJlZEdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjg1MTQ5O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjdiNzI7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0iZ2xvdyI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIiIHJlc3VsdD0iY29sb3JlZEJsdXIiLz4KICAgICAgPGZlTWVyZ2U+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJjb2xvcmVkQmx1ciIvPgogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPgogICAgICA8L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CiAgCiAgPCEtLSBCYWNrZ3JvdW5kIC0tPgogIDxyZWN0IHdpZHRoPSI2NTAiIGhlaWdodD0iNDgwIiBmaWxsPSJ1cmwoI2JnR3JhZCkiIHJ4PSIxMiIvPgogIAogIDwhLS0gRG90IHBhdHRlcm4gLS0+CiAgPHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iIzIxMjYyZCIgb3BhY2l0eT0iMC41Ii8+CiAgPC9wYXR0ZXJuPgogIDxyZWN0IHdpZHRoPSI2NTAiIGhlaWdodD0iNDgwIiBmaWxsPSJ1cmwoI2RvdHMpIi8+CiAgCiAgPCEtLSBTdGFydCBOb2RlIC0tPgogIDxyZWN0IHg9IjI3NSIgeT0iMjAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSIyMCIgZmlsbD0idXJsKCNwdXJwbGVHcmFkKSIgZmlsdGVyPSJ1cmwoI2dsb3cpIi8+CiAgPHRleHQgeD0iMzI1IiB5PSI0NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7ilrYgU3RhcnQ8L3RleHQ+CiAgCiAgPCEtLSBBcnJvdyAxIC0tPgogIDxwYXRoIGQ9Ik0zMjUgNjAgTDMyNSA4NSIgc3Ryb2tlPSIjNTg1ODU4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIvPgogIDxkZWZzPgogICAgPG1hcmtlciBpZD0iYXJyb3doZWFkIiBtYXJrZXJXaWR0aD0iMTAiIG1hcmtlckhlaWdodD0iNyIgcmVmWD0iOSIgcmVmWT0iMy41IiBvcmllbnQ9ImF1dG8iPgogICAgICA8cG9seWdvbiBwb2ludHM9IjAgMCwgMTAgMy41LCAwIDciIGZpbGw9IiM1ODU4NTgiIC8+CiAgICA8L21hcmtlcj4KICA8L2RlZnM+CiAgCiAgPCEtLSBRdWVzdGlvbiBOb2RlIDEgLS0+CiAgPHJlY3QgeD0iMjAwIiB5PSI5MCIgd2lkdGg9IjI1MCIgaGVpZ2h0PSI1MCIgcng9IjgiIGZpbGw9InVybCgjZ3JlZW5HcmFkKSIgZmlsdGVyPSJ1cmwoI2dsb3cpIi8+CiAgPHRleHQgeD0iMzI1IiB5PSIxMjAiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p2TIElzIHRoaXMgYW4gQWRtaW4gb3IgVXNlcj88L3RleHQ+CiAgCiAgPCEtLSBBcnJvd3MgZnJvbSBRMSAtLT4KICA8cGF0aCBkPSJNMjUwIDE0MCBMMTgwIDE3MCIgc3Ryb2tlPSIjNTg1ODU4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIvPgogIDxwYXRoIGQ9Ik00MDAgMTQwIEw0NzAgMTcwIiBzdHJva2U9IiM1ODU4NTgiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgbWFya2VyLWVuZD0idXJsKCNhcnJvd2hlYWQpIi8+CiAgCiAgPCEtLSBBbnN3ZXIgTm9kZTogVXNlciAtLT4KICA8cmVjdCB4PSIxMTAiIHk9IjE3NSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjMwIiByeD0iNiIgZmlsbD0iIzQ3NTU2OSIvPgogIDx0ZXh0IHg9IjE1MCIgeT0iMTk1IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VXNlcjwvdGV4dD4KICAKICA8IS0tIEFuc3dlciBOb2RlOiBBZG1pbiAtLT4KICA8cmVjdCB4PSI0NjAiIHk9IjE3NSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjMwIiByeD0iNiIgZmlsbD0iIzQ3NTU2OSIvPgogIDx0ZXh0IHg9IjUwMCIgeT0iMTk1IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWRtaW48L3RleHQ+CiAgCiAgPCEtLSBBcnJvdyBmcm9tIFVzZXIgLS0+CiAgPHBhdGggZD0iTTE1MCAyMDUgTDE1MCAyMzUiIHN0cm9rZT0iIzU4NTg1OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz4KICAKICA8IS0tIEFycm93IGZyb20gQWRtaW4gLS0+CiAgPHBhdGggZD0iTTUwMCAyMDUgTDUwMCAyMzUiIHN0cm9rZT0iIzU4NTg1OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz4KICAKICA8IS0tIFF1ZXN0aW9uIE5vZGUgMiAtLT4KICA8cmVjdCB4PSI0MCIgeT0iMjQwIiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjUwIiByeD0iOCIgZmlsbD0idXJsKCNncmVlbkdyYWQpIiBmaWx0ZXI9InVybCgjZ2xvdykiLz4KICA8dGV4dCB4PSIxNTAiIHk9IjI3MCIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7inZMgQ2FuIGFjY2VzcyBzZXR0aW5ncz88L3RleHQ+CiAgCiAgPCEtLSBSdW5ib29rIE5vZGU6IEFkbWluIFZlcmlmaWNhdGlvbiAtLT4KICA8cmVjdCB4PSIzOTAiIHk9IjI0MCIgd2lkdGg9IjIyMCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9InVybCgjYmx1ZUdyYWQpIiBmaWx0ZXI9InVybCgjZ2xvdykiLz4KICA8dGV4dCB4PSI1MDAiIHk9IjI2NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5OLIEFkbWluIFZlcmlmaWNhdGlvbjwvdGV4dD4KICA8dGV4dCB4PSI1MDAiIHk9IjI4NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2IzZDRmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2xpY2sgdG8gdmlldyBzdGVwczwvdGV4dD4KICAKICA8IS0tIEFycm93cyBmcm9tIFEyIC0tPgogIDxwYXRoIGQ9Ik05MCAyOTAgTDkwIDMyMCIgc3Ryb2tlPSIjNTg1ODU4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIvPgogIDxwYXRoIGQ9Ik0yMTAgMjkwIEwyMTAgMzIwIiBzdHJva2U9IiM1ODU4NTgiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgbWFya2VyLWVuZD0idXJsKCNhcnJvd2hlYWQpIi8+CiAgCiAgPCEtLSBBcnJvdyBmcm9tIEFkbWluIFZlcmlmaWNhdGlvbiAtLT4KICA8cGF0aCBkPSJNNTAwIDMwMCBMNTAwIDM4MCIgc3Ryb2tlPSIjNTg1ODU4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIvPgogIAogIDwhLS0gQW5zd2VyIE5vZGU6IFllcyAtLT4KICA8cmVjdCB4PSI1NSIgeT0iMzI1IiB3aWR0aD0iNzAiIGhlaWdodD0iMzAiIHJ4PSI2IiBmaWxsPSIjNDc1NTY5Ii8+CiAgPHRleHQgeD0iOTAiIHk9IjM0NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlllczwvdGV4dD4KICAKICA8IS0tIEFuc3dlciBOb2RlOiBObyAtLT4KICA8cmVjdCB4PSIxNzUiIHk9IjMyNSIgd2lkdGg9IjcwIiBoZWlnaHQ9IjMwIiByeD0iNiIgZmlsbD0iIzQ3NTU2OSIvPgogIDx0ZXh0IHg9IjIxMCIgeT0iMzQ1IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm88L3RleHQ+CiAgCiAgPCEtLSBBcnJvdyBmcm9tIFllcyAtLT4KICA8cGF0aCBkPSJNOTAgMzU1IEw5MCAzODAiIHN0cm9rZT0iIzU4NTg1OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz4KICAKICA8IS0tIEFycm93IGZyb20gTm8gLS0+CiAgPHBhdGggZD0iTTIxMCAzNTUgTDIxMCAzODAiIHN0cm9rZT0iIzU4NTg1OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz4KICAKICA8IS0tIFJ1bmJvb2sgTm9kZTogU2VsZi1SZXNldCAtLT4KICA8cmVjdCB4PSIyNSIgeT0iMzg1IiB3aWR0aD0iMTMwIiBoZWlnaHQ9IjUwIiByeD0iOCIgZmlsbD0idXJsKCNibHVlR3JhZCkiIGZpbHRlcj0idXJsKCNnbG93KSIvPgogIDx0ZXh0IHg9IjkwIiB5PSI0MTUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+TiyBTZWxmLVJlc2V0PC90ZXh0PgogIAogIDwhLS0gRW5kIE5vZGU6IEVzY2FsYXRlIC0tPgogIDxyZWN0IHg9IjE1NSIgeT0iMzg1IiB3aWR0aD0iMTEwIiBoZWlnaHQ9IjUwIiByeD0iOCIgZmlsbD0idXJsKCNyZWRHcmFkKSIgZmlsdGVyPSJ1cmwoI2dsb3cpIi8+CiAgPHRleHQgeD0iMjEwIiB5PSI0MTUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UtCBFc2NhbGF0ZTwvdGV4dD4KICAKICA8IS0tIEVuZCBOb2RlOiBSZXNvbHZlZCAtLT4KICA8cmVjdCB4PSI0MzAiIHk9IjM4NSIgd2lkdGg9IjE0MCIgaGVpZ2h0PSI1MCIgcng9IjgiIGZpbGw9IiMyMmM1NWUiIGZpbHRlcj0idXJsKCNnbG93KSIvPgogIDx0ZXh0IHg9IjUwMCIgeT0iNDE1IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKchSBSZXNvbHZlZDwvdGV4dD4KICAKICA8IS0tIFdhdGVybWFyayAtLT4KICA8dGV4dCB4PSIzMjUiIHk9IjQ2NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzU4NTg1OCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Rmxvd2Jvb2sgfCBBSSBSdW5ib29rIERlY29tcG9zaXRpb248L3RleHQ+Cjwvc3ZnPg==" />
  </picture>
</p>

<p align="center">
  <em>☝️ This is just a pretty picture, not the actual app. The real thing is way cooler.</em>
</p>

---

## The Problem

Support teams often struggle with complex runbooks that contain:
- 🔀 Too many conditional branches ("if this, then that")
- 🤔 Mixed decision-making and execution steps
- 📚 Overlapping procedures across multiple documents
- ⏱️ Long time-to-resolution due to navigation confusion

**Result:** Support engineers waste time figuring out *which* procedure to follow instead of *executing* the right one.

## The Solution

**Flowbook** uses AI to decompose complex runbooks into:

1. **🔀 Decision Flowchart** — Scoping questions that guide support engineers to the right procedure
2. **📋 Simplified Runbooks** — Pure execution checklists with zero conditional logic

> *"All reasoning goes into the flowchart. All execution goes into the runbooks."*

---

## Features

### 🤖 AI-Powered Analysis with Streaming

Drop in your markdown runbook and Claude AI will:
- Identify all decision points and branch logic
- Extract individual procedures into standalone runbooks
- Generate scoping questions with source references
- Create a navigable flowchart structure

**Real-time streaming progress** shows you exactly what's happening:
- Step-by-step analysis updates
- Live progress percentage
- AI reasoning visible after analysis

**Large document support** — Automatically chunks documents that exceed token limits and merges results intelligently.

### 🎯 Interactive Flowchart Visualization

Built with React Flow for a smooth, interactive experience:

| Node Type | Color | Purpose |
|-----------|-------|---------|
| **Start** | 🟣 Purple | Entry point to the flowchart |
| **Question** | 🟢 Green | Decision points with scoping questions |
| **Answer** | ⚪ Gray | Selected choices that lead to next steps |
| **Runbook** | 🔵 Blue | Clickable procedure nodes |
| **End** | Various | Terminal states (Resolved ✅, Escalate 🔺, Manual ⏱️, Blocked 🚫) |

### 🧭 Guided Navigation Mode

- Start at the beginning, answer questions, follow the path
- Current path highlighted with animated edges
- Expand/collapse branches as needed
- Perfect for training new team members
- Toggle between guided mode and full view

### 🔍 Source References

Every question in the flowchart includes:
- **Exact quote** from your original documentation
- **Section reference** showing where it came from
- **AI reasoning** explaining why this question matters

*No more wondering "where did this question come from?"*

### 🔄 Iterative Refinement

Fine-tune your flowchart without re-analyzing:

| Action | Description |
|--------|-------------|
| **Regenerate** | Regenerate any node with custom feedback to improve questions |
| **Expand** | Add more detail to node labels, descriptions, and runbook steps |
| **Delete** | Remove nodes that don't fit your workflow |
| **Rephrase** | Convert category labels into proper questions |
| **Re-analyze** | Generate a fresh flowchart from scratch |

### 📋 Detailed Runbook Viewer

Click any runbook node to see:
- **Prerequisites** — What's needed before starting
- **Numbered Steps** — Clear execution checklist
- **Step Details** — Additional context for each step
- **Warnings** — Important cautions highlighted in amber
- **Tools Required** — Required tools/access for each step
- **Notes** — Additional context and tips
- **Related Runbooks** — Quick navigation to related procedures

### 💾 Save & Load Projects

- Save complete project state including:
  - Flowchart data (nodes, edges, runbooks)
  - UI state (expanded nodes, current path, guided mode)
- Load projects to continue where you left off
- Share project files with team members

---

## Search

### 🔎 Semantic Search with Local Embeddings

Flowbook includes a powerful AI-powered search feature:

- **Semantic understanding** — Finds relevant content by meaning, not just keywords
- **Local processing** — Uses Xenova/all-MiniLM-L6-v2 running in your browser
- **Indexes everything**:
  - Flowchart nodes
  - Runbook content
  - Original markdown sections

### ✨ AI-Generated Answers

Press `⌘/Ctrl + Enter` to generate an AI response that:
- Synthesizes search results into a clear answer
- Provides clickable references to nodes and runbooks
- Cites sources from your original documentation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + F` | Open search |
| `Esc` | Close search |
| `⌘/Ctrl + Enter` | Generate AI response |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/flowbook.git
cd flowbook
npm install
```

### 2. Configure API Keys

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:

```env
# Required - Get from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Optional - Get from https://aistudio.google.com
# Used for AI-generated flowchart images
GOOGLE_AI_API_KEY=...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

### Input: Complex Runbook

```markdown
# Account Issues Runbook

## Step 1: Identify the User
- Search by email in Atlas
- If multiple accounts found, go to Step 2
- If single account, go to Step 3

## Step 2: Handle Duplicates
If admin needs to free up an email address:
  1. Change email on old account
  2. Send new invite to freed email
If user created duplicate account by mistake:
  1. Verify account is empty
  2. Deactivate duplicate account
...
```

### Output: Decision Flowchart + Simple Runbooks

**Flowchart:**
```
Start → "Multiple accounts?" → Yes → "Need to free up email?" → Yes → [Change Account Email]
                            → No  → [Standard Account Lookup]
```

**Runbook: Change Account Email**
```
Prerequisites: Admin access

Steps:
1. Open the account in admin panel
2. Navigate to Account Settings
3. Change email to temporary value
4. Save changes
5. Send new invite to freed email

✅ Done
```

---

## Export Options

Flowbook offers comprehensive export options organized into categories:

### 💾 Save & Load

| Format | Description |
|--------|-------------|
| **Save Project** | Full project with UI state (.json) |
| **Load Project** | Restore a previously saved project |

### 🌐 Share Interactive

| Format | Description |
|--------|-------------|
| **Interactive HTML** | Single-file app you can email to anyone |
| **Mermaid Live** | Opens in mermaid.live for editing and sharing |

### 📚 Documentation

These exports are enriched with Claude AI for detailed, publication-ready content:

| Format | Description |
|--------|-------------|
| **Confluence (DOCX)** | Import directly into Confluence via Word |
| **Confluence (Wiki)** | Wiki markup to paste into Confluence |
| **Google Docs (DOCX)** | Import directly into Google Docs |
| **Google Docs (MD)** | Markdown for import into Google Docs |

> **Note:** Documentation exports use Claude AI to enrich runbook content with more detailed steps, warnings, and context. Results are cached to save API costs.

### 📤 Static Exports

| Format | Description |
|--------|-------------|
| **AI Generated PNG** | Beautiful flowchart image via Gemini AI |
| **Export PNG** | Screenshot of current flowchart view |
| **Export SVG** | Vector graphic for high-quality scaling |
| **Mermaid Code** | `.mmd` file for version control |
| **Runbooks (MD)** | All runbooks as markdown documentation |
| **JSON Data** | Raw flowchart data for integrations |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 15](https://nextjs.org) | React framework with App Router |
| [React 19](https://react.dev) | UI library |
| [React Flow 11](https://reactflow.dev) | Interactive flowchart rendering |
| [Claude AI](https://anthropic.com) | Runbook analysis and decomposition |
| [Gemini AI](https://ai.google.dev) | Flowchart image generation |
| [Xenova Transformers](https://github.com/xenova/transformers.js) | Local embeddings for semantic search |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [TypeScript 5](https://typescriptlang.org) | Type safety |
| [docx](https://docx.js.org) | Word document generation |
| [html-to-image](https://github.com/bubkoo/html-to-image) | Screenshot exports |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/           # Main analysis endpoint
│   │   ├── analyze-stream/    # Streaming progress endpoint
│   │   ├── enrich-runbooks/   # Enrich runbooks for documentation
│   │   ├── generate-image/    # Gemini image generation
│   │   ├── regenerate-node/   # Regenerate individual nodes
│   │   └── search-response/   # AI search response generation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AISearchResponse.tsx   # AI answer display
│   ├── AnalysisProgress.tsx   # Streaming progress indicator
│   ├── ExportMenu.tsx         # Export dropdown with all options
│   ├── Flowchart.tsx          # React Flow wrapper
│   ├── FlowchartNode.tsx      # Custom node components
│   ├── MarkdownInput.tsx      # Input form
│   ├── RunbookViewer.tsx      # Runbook detail panel
│   └── SearchModal.tsx        # Semantic search modal
├── lib/
│   ├── anthropic.ts           # Claude API integration
│   ├── export-interactive.ts  # HTML/Mermaid/Confluence/GDocs export
│   ├── gemini.ts              # Gemini image generation
│   └── search.ts              # Local embedding search
└── types/
    └── schema.ts              # TypeScript definitions
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key for analysis |
| `GOOGLE_AI_API_KEY` | ❌ No | Gemini API key for image generation |

### AI Models Used

| Model | Provider | Purpose |
|-------|----------|---------|
| Claude 3.5 Sonnet | Anthropic | Runbook analysis, node regeneration, search responses |
| Gemini 3 Pro | Google | AI-generated flowchart images |
| all-MiniLM-L6-v2 | Xenova (Local) | Semantic search embeddings |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze markdown and return flowchart |
| `/api/analyze-stream` | POST | Streaming analysis with progress events |
| `/api/regenerate-node` | POST | Regenerate or expand a single node |
| `/api/enrich-runbooks` | POST | Enrich runbooks with detailed content |
| `/api/generate-image` | POST | Generate flowchart image with Gemini |
| `/api/search-response` | POST | Generate AI response from search results |

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| `⌘/Ctrl + F` | Flowchart view | Open search modal |
| `Esc` | Search modal | Close modal |
| `⌘/Ctrl + Enter` | Search modal | Generate AI response |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ for support teams everywhere</sub>
</p>

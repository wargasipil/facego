package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed frontend/*
var staticFrontend embed.FS

type frontendHandler struct {
	sub fs.FS
}

// ServeHTTP implements [http.Handler].
// Static assets are served directly; any unknown path falls back to index.html
// so that React Router can handle client-side navigation.
func (f *frontendHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		path = "index.html"
	}

	_, err := fs.Stat(f.sub, path)
	if err != nil {
		// Unknown path → SPA fallback
		http.ServeFileFS(w, r, f.sub, "index.html")
		return
	}

	http.FileServerFS(f.sub).ServeHTTP(w, r)
}

func NewFrontendhandler() http.Handler {
	sub, err := fs.Sub(staticFrontend, "frontend")
	if err != nil {
		panic(err)
	}
	return &frontendHandler{sub: sub}
}

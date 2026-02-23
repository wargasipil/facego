package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strings"

	"github.com/urfave/cli/v3"
	"github.com/wargasipil/student_pack/webutils"
	"github.com/wargasipil/student_pack/whatsapp_service"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type WebAction cli.ActionFunc

func NewWebAction(
	cfg *AppConfig,
	mux *http.ServeMux,
	reflectRegister webutils.ReflectRegisterFunc,
	whatsappRegister whatsapp_service.RegisterFunc,
	serveFrontend ServeFrontendFunc,
) WebAction {
	return func(ctx context.Context, c *cli.Command) error {
		reflectNames := []string{}

		// registering service
		reflectNames = append(reflectNames, whatsappRegister()...)

		// registering reflect
		reflectRegister(reflectNames...)

		port := os.Getenv("PORT")
		if port == "" {
			port = "8081"
		}
		host := "localhost"
		listen := fmt.Sprintf("%s:%s", host, port)
		log.Println("listening on", listen)

		// Start frontend in a separate goroutine
		log.Println("starting frontend server")

		if cfg.OpenBrowser {
			go serveFrontend()
			OpenBrowser("http://localhost:8082")
		}

		return http.ListenAndServe(
			listen,
			// Use h2c so we can serve HTTP/2 without TLS.
			h2c.NewHandler(
				withCors(mux),
				&http2.Server{}),
		)
	}
}

//go:embed static/*
var staticFiles embed.FS

type ServeFrontendFunc func() error

func NewServeFrontend() ServeFrontendFunc {
	return func() error {
		mux := http.NewServeMux()

		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			var err error
			cleanPath := path.Clean(r.URL.Path)
			rel := strings.TrimPrefix(cleanPath, "/")

			// if root, serve index
			if rel == "" {
				rel = "index.html"
			}
			fp, _ := url.JoinPath("static", rel)

			var file fs.File
			file, err = staticFiles.Open(fp)
			if err != nil {
				// fallback to index.html for SPA routes / when file not found
				fp, _ = url.JoinPath("static", "index.html")
			} else {
				file.Close()
			}

			http.ServeFileFS(w, r, staticFiles, fp)

		})

		addr := "localhost:8082"
		log.Printf("starting server on %s", addr)
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.Fatal(err)
		}

		return nil
	}
}

func withCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Connect-Protocol-Version, Referer, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Methods", "HEAD,PATCH,OPTIONS,GET,POST,PUT,DELETE")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func OpenBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	default: // linux, freebsd, etc.
		cmd = "xdg-open"
		args = []string{url}
	}

	return exec.Command(cmd, args...).Start()
}

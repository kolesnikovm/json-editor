package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"

	"github.com/gobuffalo/packr/v2"
)

func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	port := flag.String("port", "3010", "listen port")
	flag.Parse()

	box := packr.New("build", "./build")
	http.Handle("/", http.FileServer(box))

	openBrowser("http://localhost:" + *port)
	log.Fatal(http.ListenAndServe(":"+*port, nil))
}

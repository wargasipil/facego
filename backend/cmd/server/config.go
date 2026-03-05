package main

import (
	"os"

	"github.com/wargasipil/facego/internal/configs"
)

func NewConfig() (*configs.AppConfig, error) {
	configPath := os.Getenv("FACEGO_CONFIG")
	if configPath == "" {
		configPath = "configs/dev.yaml"
	}
	return configs.Load(configPath)
}

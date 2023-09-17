build: deps
	pnpm run build

run: deps
	pnpm run dev

deps: node_modules

node_modules: ./pnpm-lock.yaml
	pnpm install

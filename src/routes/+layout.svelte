<header>
  <h1>Call This?</h1>
</header>

<main>
    <slot />
</main>

<style lang="scss">
:global(body) {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:global(a) {
  color: #42b983;
  cursor: pointer;

  &:hover {
    color: #5742b9;
  } 
}

header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 0px 20px;
  margin: 0;

  font-weight: bold;
  background-color: rgb(170,60,110);
  color: rgba(255,255,255,0.8);
  box-shadow: 0 2px 4px rgba(172,55,139, 0.2);
}

header h1 {
  font-size: 2em;
  color: #fff;
}

main {
    margin: 20px;
}
</style>

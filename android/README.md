# Controle de Finanças Android

O launcher Android abre a aplicação web do sistema em uma WebView. Assim, login, transações, importação e exportação usam a mesma API e a mesma conta PostgreSQL da versão para computador.

## Requisitos

- Android Studio Ladybug ou mais recente
- JDK 17
- Gradle 8.9
- Android SDK 35
- Acesso de rede ao servidor `172.28.4.149:3000`

O aparelho precisa alcançar o servidor pela rede. A aplicação web é servida em HTTP e a configuração Android permite tráfego sem TLS somente para o host `172.28.4.149`. Não use essa configuração para expor a aplicação em redes públicas; configure HTTPS antes de disponibilizá-la fora da rede confiável.

## Gerar o APK

O repositório ainda não inclui Gradle Wrapper (`gradlew`). Instale os requisitos acima e execute na raiz do repositório:

```bash
gradle -p android assembleDebug
```

O APK de depuração será gerado em `android/app/build/outputs/apk/debug/app-debug.apk`. No Android Studio, abra `android/`, configure o Gradle local 8.9 e selecione **Build > Build APK(s)**.

O seletor de arquivos do Android é usado para importar CSV e escolher onde salvar a exportação. O código Compose/Room anterior continua no projeto, mas não é a atividade iniciada pelo APK configurado atualmente.

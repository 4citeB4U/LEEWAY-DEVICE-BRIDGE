plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}
android {
    namespace = "industries.leeway.devicebridge"
    compileSdk = 35
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // One canonical Android product; separate debug builds from release distribution.
    // Private release keystore is injected by the authorized CI runner, never stored
    // in Git, exposed to the browser, or regenerated during an update.
    val releaseStore = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEYSTORE_PATH").orNull
    val releasePassword = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_STORE_PASSWORD").orNull
    val releaseAlias = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEY_ALIAS").orNull
    val releaseKeyPassword = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEY_PASSWORD").orNull
    val releaseCredentialsPresent = listOf(releaseStore, releasePassword, releaseAlias, releaseKeyPassword)
        .all { !it.isNullOrBlank() }

    if (releaseCredentialsPresent) {
        signingConfigs {
            create("leewayRelease") {
                storeFile = file(requireNotNull(releaseStore))
                storePassword = releasePassword
                keyAlias = releaseAlias
                keyPassword = releaseKeyPassword
            }
        }
    }
    buildTypes {
        getByName("release") {
            isDebuggable = false
            if (releaseCredentialsPresent) {
                signingConfig = signingConfigs.getByName("leewayRelease")
            }
        }
    }
    buildFeatures {
        buildConfig = true
    }
    defaultConfig {
        applicationId = "industries.leeway.devicebridge"
        minSdk = 29
        targetSdk = 35
        versionCode = 25
        versionName = "0.10.0-agent-update-rc1"
    }
}
dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.google.ai.edge.litertlm:litertlm-android:0.17.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

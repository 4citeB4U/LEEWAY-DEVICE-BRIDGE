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
    buildFeatures {
        buildConfig = true
    }
    defaultConfig {
        applicationId = "industries.leeway.devicebridge"
        minSdk = 29
        targetSdk = 35
        versionCode = 26
        versionName = "0.10.0-sovereign-rc2"
    }
    // Signing material must be injected by the authorized build host.
    // A release may build unsigned for source qualification; publication
    // requires a distinct, independently verified secure signing step.
    val releaseStorePath = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEYSTORE_PATH").orNull
    val releaseStorePassword = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_STORE_PASSWORD").orNull
    val releaseKeyAlias = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEY_ALIAS").orNull
    val releaseKeyPassword = providers.environmentVariable("LEEWAY_ANDROID_RELEASE_KEY_PASSWORD").orNull
    val releaseSigningReady = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword)
        .all { !it.isNullOrBlank() } && releaseStorePath != null && file(releaseStorePath).isFile
    signingConfigs {
        create("release") {
            if (releaseSigningReady) {
                storeFile = file(releaseStorePath!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (releaseSigningReady) signingConfig = signingConfigs.getByName("release")
        }
    }
    lint {
        checkReleaseBuilds = true
        abortOnError = true
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

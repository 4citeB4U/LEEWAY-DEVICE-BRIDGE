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
    signingConfigs {
        create("release") {
            val keystoreFile = file("../leeway-release-key.jks")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = "LeeWaySovereign2026!"
                keyAlias = "leeway-release"
                keyPassword = "LeeWaySovereign2026!"
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
                enableV4Signing = true
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    lint {
        checkReleaseBuilds = false
        abortOnError = false
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

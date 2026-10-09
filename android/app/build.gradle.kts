import java.util.Base64

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ktlint)
}

android {
    namespace = "com.freezzz.platform"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.freezzz.platform"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
    }
}

tasks.register("restorePhotoIcon") {
    doLast {
        val source = rootProject.file("icon/freezzz_icon.b64")
        val target = project.file("src/main/res/drawable/freezzz_photo.png")
        target.parentFile.mkdirs()
        target.writeBytes(Base64.getDecoder().decode(source.readText().trim()))
    }
}
tasks.named("preBuild").configure { dependsOn("restorePhotoIcon") }

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.webkit)
}

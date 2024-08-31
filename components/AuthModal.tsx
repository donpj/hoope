import { AuthStrategy, ModalType } from "@/types/enums";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Image, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

const LOGIN_OPTIONS = [
  {
    text: "Continue with Google",
    icon: require("@/assets/images/login/google.png"),
    strategy: AuthStrategy.Google,
  },

  {
    text: "Continue with Apple",
    icon: require("@/assets/images/login/apple.png"),
    strategy: AuthStrategy.Apple,
  },
];

interface AuthModalProps {
  authType: ModalType | null;
}

const AuthModal = ({ authType }: AuthModalProps) => {
  useWarmUpBrowser();
  const router = useRouter();
  const { startOAuthFlow: googleAuth } = useOAuth({
    strategy: AuthStrategy.Google,
  });
  const { startOAuthFlow: appleAuth } = useOAuth({
    strategy: AuthStrategy.Apple,
  });
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();

  // Navigate to the appropriate screen based on the authType (login or sign-up)
  const navigateToEmailAuth = () => {
    if (authType === ModalType.Login) {
      router.push("/authentication/login"); // Navigate to Login screen
    } else if (authType === ModalType.SignUp) {
      router.push("/authentication/register"); // Navigate to Sign-Up screen
    }
  };

  const onSelectAuth = async (strategy: AuthStrategy) => {
    console.log(`Selected auth strategy: ${strategy}`);

    if (!signIn || !signUp) {
      console.log("SignIn or SignUp is not available.");
      return;
    }

    const selectedAuth = {
      [AuthStrategy.Google]: googleAuth,
      [AuthStrategy.Apple]: appleAuth,
    }[strategy];

    try {
      const { createdSessionId, setActive, authSessionResult } =
        await selectedAuth();
      console.log("OAuth flow result:", authSessionResult);

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        console.log("OAuth success standard");
      }
    } catch (err) {
      console.error("OAuth error", err);
    }
  };

  return (
    <BottomSheetView style={[styles.modalContainer]}>
      <TouchableOpacity style={styles.modalBtn} onPress={navigateToEmailAuth}>
        <Ionicons name="mail-outline" size={20} />
        <Text style={styles.btnText}>
          {authType === ModalType.Login ? "Log in" : "Sign up"} with Email
        </Text>
      </TouchableOpacity>
      {LOGIN_OPTIONS.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.modalBtn}
          onPress={() => onSelectAuth(option.strategy!)}
        >
          <Image source={option.icon} style={styles.btnIcon} />
          <Text style={styles.btnText}>{option.text}</Text>
        </TouchableOpacity>
      ))}
    </BottomSheetView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    alignItems: "flex-start",
    padding: 20,
    gap: 20,
  },
  modalBtn: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderColor: "#fff",
    borderWidth: 1,
    marginTop: 10,
  },
  btnIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  btnText: {
    fontSize: 18,
  },
});

export default AuthModal;
